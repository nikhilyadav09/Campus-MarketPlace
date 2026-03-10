// StatusBadge component - Clear, distinct status indicators
// Supports clickable badges for filtering

import { ITEM_STATUS, RESERVATION_STATUS } from '../../constants/status';
import './StatusBadge.css';

function StatusBadge({ status, type = 'item', clickable = false, onClick }) {
    const getStatusConfig = () => {
        if (type === 'item') {
            switch (status) {
                case ITEM_STATUS.AVAILABLE:
                    return { label: 'Available', variant: 'available' };
                case ITEM_STATUS.RESERVED:
                    return { label: 'Reserved', variant: 'reserved' };
                case ITEM_STATUS.SOLD:
                    return { label: 'Sold', variant: 'sold' };
                default:
                    return { label: status, variant: 'sold' };
            }
        } else {
            switch (status) {
                case RESERVATION_STATUS.ACTIVE:
                    return { label: 'Active', variant: 'reserved' };
                case RESERVATION_STATUS.COMPLETED:
                    return { label: 'Completed', variant: 'available' };
                case RESERVATION_STATUS.CANCELLED:
                    return { label: 'Cancelled', variant: 'sold' };
                case RESERVATION_STATUS.EXPIRED:
                    return { label: 'Expired', variant: 'sold' };
                default:
                    return { label: status, variant: 'sold' };
            }
        }
    };

    const config = getStatusConfig();
    const classNames = [
        'status-badge',
        `status-badge-${config.variant}`,
        clickable ? 'status-badge-clickable' : ''
    ].filter(Boolean).join(' ');

    const handleClick = (e) => {
        if (clickable && onClick) {
            e.preventDefault();
            e.stopPropagation();
            onClick(status);
        }
    };

    return (
        <span
            className={classNames}
            onClick={handleClick}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
        >
            {config.label}
        </span>
    );
}

export default StatusBadge;
