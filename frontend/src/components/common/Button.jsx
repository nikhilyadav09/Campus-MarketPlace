// Button component - Clean, functional

import './Button.css';

function Button({
    children,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    className = ''
}) {
    const classes = [
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            className={classes}
            disabled={disabled || loading}
            onClick={onClick}
        >
            {loading ? 'Loading...' : children}
        </button>
    );
}

export default Button;
