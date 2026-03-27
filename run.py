import subprocess
import sys
import os
import time
import platform
import shutil
import signal
from pathlib import Path
from threading import Thread
import socket
import urllib.request
import urllib.error

# =============================================================================
# CONFIGURATION
# =============================================================================
BACKEND_DIR = os.path.join(os.getcwd(), 'backend')
FRONTEND_DIR = os.path.join(os.getcwd(), 'frontend')
VENV_DIR = os.path.join(BACKEND_DIR, 'venv')
SEED_MARKER_PATH = os.path.join(BACKEND_DIR, '.db_seeded')
DEFAULT_DATABASE_URL = "postgresql://postgres:Ajay%40123@localhost:5432/campus_marketplace"

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log(message, color=Colors.BLUE):
    print(f"{color}[Runner] {message}{Colors.ENDC}")

def error(message):
    print(f"{Colors.FAIL}[Error] {message}{Colors.ENDC}")

# =============================================================================
# SYSTEM CHECKS
# =============================================================================
def check_command(command, name):
    if not shutil.which(command):
        error(f"{name} is not installed or not in PATH.")
        return False
    return True

def check_postgres():
    """Check if PostgreSQL is running and accessible."""
    log("Checking PostgreSQL status...", Colors.CYAN)
    
    # Try different commands based on OS
    system = platform.system().lower()
    
    try:
        if system == 'windows':
            # Check service status using sc
            result = subprocess.run(["sc", "query", "postgresql-x64-15"], capture_output=True, text=True) # Adjust version if needed
            if "RUNNING" in result.stdout:
                 log("PostgreSQL service is RUNNING.", Colors.GREEN)
                 return True
            
            # Try generic service check if version specific failed
            result = subprocess.run(["sc", "query", "postgresql"], capture_output=True, text=True)
            if "RUNNING" in result.stdout:
                 log("PostgreSQL service is RUNNING.", Colors.GREEN)
                 return True
                 
            log("PostgreSQL service not detected running via SC. Checking via pg_isready...", Colors.WARNING)
            
        # Common check using pg_isready (if tools installed)
        if shutil.which("pg_isready"):
             result = subprocess.run(["pg_isready", "-h", "localhost", "-p", "5432"], capture_output=True)
             if result.returncode == 0:
                 log("PostgreSQL is accepting connections.", Colors.GREEN)
                 return True
    except Exception as e:
        log(f"Could not verify PostgreSQL status: {e}", Colors.WARNING)

    log("⚠️  Create sure PostgreSQL is running!", Colors.WARNING)
    return True # Don't block startup, just warn

def kill_processes_on_port(port):
    """Kill any process listening on the given port."""
    log(f"Cleaning up port {port}...", Colors.CYAN)
    system = platform.system().lower()
    try:
        if system == 'windows':
            # Use netstat to find PID
            cmd = f"netstat -ano | findstr :{port}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            for line in result.stdout.strip().split('\n'):
                if 'LISTENING' in line:
                    parts = line.split()
                    pid = parts[-1]
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
        else:
            # Use lsof on Linux/macOS
            cmd = f"lsof -t -i :{port}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                if pid:
                    subprocess.run(f"kill -9 {pid}", shell=True, capture_output=True)
    except Exception as e:
        log(f"Port cleanup failed for {port}: {e}", Colors.WARNING)

def wait_for_backend(url, timeout=30):
    """Wait for backend to be healthy."""
    log(f"Waiting for backend to be healthy at {url}...", Colors.CYAN)
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    log("✅ Backend is healthy!", Colors.GREEN)
                    return True
        except (urllib.error.URLError, ConnectionResetError, socket.timeout):
            pass
        time.sleep(1)
    error(f"Backend did not become healthy within {timeout}s")
    return False

# =============================================================================
# PROCESS MANAGEMENT
# =============================================================================
processes = []

def run_backend():
    log("Starting Backend (Flask)...", Colors.GREEN)
    
    # Use venv python if exists, else system python
    python_cmd = sys.executable
    if os.path.exists(VENV_DIR):
        if platform.system() == 'Windows':
            python_cmd = os.path.join(VENV_DIR, 'Scripts', 'python.exe')
        else:
            python_cmd = os.path.join(VENV_DIR, 'bin', 'python')
            
    cmd = [python_cmd, "app.py"]
    
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    
    return subprocess.Popen(
        cmd, 
        cwd=BACKEND_DIR, 
        env=env,
        stdout=sys.stdout,
        stderr=sys.stderr
    )

def run_frontend():
    log("Starting Frontend (Vite)...", Colors.GREEN)
    
    # Use npm via shell
    cmd = "npm run dev"
    if platform.system() == 'Windows':
        cmd = "npm.cmd run dev"
        
    return subprocess.Popen(
        cmd,
        cwd=FRONTEND_DIR,
        shell=True,
        stdout=sys.stdout,
        stderr=sys.stderr
    )

def cleanup(signum, frame):
    log("\nShutting down services...", Colors.WARNING)
    for p in processes:
        try:
            if platform.system() == 'Windows':
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(p.pid)])
            else:
                os.killpg(os.getpgid(p.pid), signal.SIGTERM)
        except Exception:
            pass
    sys.exit(0)

# =============================================================================
# MAIN
# =============================================================================
# =============================================================================
# SETUP HELPERS
# =============================================================================
def get_python_cmd():
    """Get the correct python command/path."""
    python_cmd = sys.executable
    if os.path.exists(VENV_DIR):
        if platform.system() == 'Windows':
            python_cmd = os.path.join(VENV_DIR, 'Scripts', 'python.exe')
        else:
            python_cmd = os.path.join(VENV_DIR, 'bin', 'python')
    return python_cmd

def install_dependencies():
    """Install backend dependencies from requirements.txt."""
    log("Installing dependencies...", Colors.CYAN)
    python_cmd = get_python_cmd()
    try:
        subprocess.check_call([python_cmd, "-m", "pip", "install", "-r", "requirements.txt"], cwd=BACKEND_DIR)
        log("Dependencies installed.", Colors.GREEN)
    except subprocess.CalledProcessError:
        error("Failed to install dependencies.")
        sys.exit(1)

def install_frontend_dependencies():
    """Install frontend dependencies if node_modules is missing."""
    node_modules_path = os.path.join(FRONTEND_DIR, 'node_modules')
    if not os.path.exists(node_modules_path):
        log("Installing frontend dependencies...", Colors.CYAN)
        cmd = "npm install"
        if platform.system() == 'Windows':
            cmd = "npm.cmd install"
            
        try:
            subprocess.check_call(cmd, cwd=FRONTEND_DIR, shell=True)
            log("Frontend dependencies installed.", Colors.GREEN)
        except subprocess.CalledProcessError:
            error("Failed to install frontend dependencies.")
            sys.exit(1)
    else:
        log("Frontend dependencies already installed.", Colors.CYAN)

# =============================================================================
# DATABASE SEEDING HELPERS
# =============================================================================
def needs_database_seed():
    """Check whether the database needs to be (re)seeded."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        # dotenv isn't critical here; continue without it
        pass

    try:
        import psycopg
    except ImportError:
        log("psycopg not available yet; assuming database seed is required.", Colors.WARNING)
        return True

    db_url = os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)

    try:
        with psycopg.connect(db_url, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT to_regclass('public.users')")
                users_table_exists = cur.fetchone()[0] is not None
                if not users_table_exists:
                    return True

                cur.execute("SELECT COUNT(*) FROM users")
                return cur.fetchone()[0] == 0
    except Exception as exc:
        log(f"Could not inspect database state ({exc}). Seeding will run to ensure schema exists.", Colors.WARNING)
        return True


def run_seed(force=False):
    """Run database seed script once unless forced."""
    marker_path = Path(SEED_MARKER_PATH)

    if force:
        log("FORCE_DB_SEED=true detected - database will be reseeded.", Colors.WARNING)
        if marker_path.exists():
            marker_path.unlink()
    else:
        if marker_path.exists():
            log("Database already seeded; skipping automatic seeding (remove backend/.db_seeded or set FORCE_DB_SEED=true to reseed).", Colors.CYAN)
            return
        if not needs_database_seed():
            log("Existing data detected; skipping automatic seeding.", Colors.CYAN)
            marker_path.touch()
            return

    log("Initializing database (seeding)...", Colors.CYAN)
    python_cmd = get_python_cmd()
    try:
        subprocess.check_call([python_cmd, "seed.py"], cwd=BACKEND_DIR)
        log("Database initialized.", Colors.GREEN)
        marker_path.touch()
    except subprocess.CalledProcessError:
        error("Failed to seed database. Check if PostgreSQL is running.")

# =============================================================================
# MAIN
# =============================================================================
def main():
    log("Initializing Campus Marketplace...", Colors.HEADER)
    
    # 1. System Checks
    if not check_command("node", "Node.js"): return
    if not check_command("npm", "npm"): return
    check_postgres()
    
    # 2. Setup Virtual Environment & Dependencies
    if not os.path.exists(VENV_DIR):
        log("No virtual environment found. Creating one...", Colors.WARNING)
        try:
             subprocess.check_call([sys.executable, "-m", "venv", "venv"], cwd=BACKEND_DIR)
             log("Virtual environment created.", Colors.GREEN)
        except Exception as e:
             error(f"Failed to create venv: {e}")
             return
    else:
        log("Using existing virtual environment.", Colors.CYAN)

    # Install Backend Dependencies
    install_dependencies()
    
    # Install Frontend Dependencies
    install_frontend_dependencies()
    
    # 3. Seed Database (only if needed)
    force_seed = os.environ.get('FORCE_DB_SEED', 'false').lower() == 'true'
    run_seed(force=force_seed)

    # 4. Start Processes
    try:
        # Cleanup existing processes
        kill_processes_on_port(8000)
        kill_processes_on_port(5173)
        kill_processes_on_port(5174)

        backend_proc = run_backend()
        processes.append(backend_proc)
        
        # Wait for backend to be healthy before starting frontend
        if not wait_for_backend("http://localhost:8000/auth/me"):
            cleanup(None, None)
            return
        
        frontend_proc = run_frontend()
        processes.append(frontend_proc)
        
        log("\n🚀 Services are running!", Colors.HEADER)
        log("   Frontend: http://localhost:5173", Colors.CYAN)
        log("   Backend:  http://localhost:8000", Colors.CYAN)
        log("   Press Ctrl+C to stop.\n", Colors.HEADER)
        
        # Keep main thread alive
        backend_proc.wait()
        frontend_proc.wait()
        
    except KeyboardInterrupt:
        cleanup(None, None)
    except Exception as e:
        error(f"Startup failed: {e}")
        cleanup(None, None)

if __name__ == "__main__":
    # Register signal handlers
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    main()
