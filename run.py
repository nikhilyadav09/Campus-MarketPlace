import subprocess
import sys
import os
import time
import platform
import shutil
import signal
from threading import Thread

# =============================================================================
# CONFIGURATION
# =============================================================================
BACKEND_DIR = os.path.join(os.getcwd(), 'backend')
FRONTEND_DIR = os.path.join(os.getcwd(), 'frontend')
VENV_DIR = os.path.join(BACKEND_DIR, 'venv')

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

def run_seed():
    """Run database seed script."""
    log("Initializing database (seeding)...", Colors.CYAN)
    python_cmd = get_python_cmd()
    try:
        subprocess.check_call([python_cmd, "seed.py"], cwd=BACKEND_DIR)
        log("Database initialized.", Colors.GREEN)
    except subprocess.CalledProcessError:
        error("Failed to seed database. Check if PostgreSQL is running.")
        # We don't exit here, as it might just be already seeded or minor error, let backend try to start
        
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
    
    # 3. Seed Database
    run_seed()

    # 4. Start Processes
    try:
        backend_proc = run_backend()
        processes.append(backend_proc)
        
        # Give backend a moment to initialize
        time.sleep(2)
        
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
