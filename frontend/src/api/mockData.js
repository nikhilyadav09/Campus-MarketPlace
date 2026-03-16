import { ITEM_STATUS, RESERVATION_STATUS } from '../constants/status';

const now = Date.now();

export const mockUsers = [
  { id: 1, name: 'Ajay', email: 'ajay@campus.edu', mobile: '9876543210', hostel: 'A Block', room: '101' },
  { id: 2, name: 'Priya Sharma', email: 'priya@campus.edu', mobile: '9876501234', hostel: 'C Block', room: '212' },
  { id: 3, name: 'Rohan Mehta', email: 'rohan@campus.edu', mobile: '9876505678', hostel: 'B Block', room: '305' },
  { id: 4, name: 'Neha Verma', email: 'neha@campus.edu', mobile: '9876509999', hostel: 'D Block', room: '118' }
];

export const mockCategories = [
  { id: 1, name: 'Electronics', parent_id: null },
  { id: 2, name: 'Books', parent_id: null },
  { id: 3, name: 'Accessories', parent_id: null },
  { id: 4, name: 'Furniture', parent_id: null },
  { id: 5, name: 'Sports', parent_id: null },
  { id: 6, name: 'Clothing', parent_id: null },
  { id: 7, name: 'Other', parent_id: null }
];

export const mockItems = [
  {
    id: 101,
    title: 'TI-84 Scientific Calculator',
    description: 'Great for engineering maths. Works perfectly.',
    price: 1800,
    category_id: 1,
    seller_id: 2,
    status: ITEM_STATUS.AVAILABLE,
    image_url: '',
    created_at: new Date(now - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: 102,
    title: 'Data Structures Textbook',
    description: 'Minimal highlights, latest edition.',
    price: 650,
    category_id: 2,
    seller_id: 3,
    status: ITEM_STATUS.RESERVED,
    image_url: '',
    created_at: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    buyer_id: 1
  },
  {
    id: 103,
    title: 'Study Table with Lamp',
    description: 'Sturdy wooden table, pickup from hostel.',
    price: 2500,
    category_id: 4,
    seller_id: 1,
    status: ITEM_STATUS.SOLD,
    image_url: '',
    created_at: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    buyer_id: 4
  },
  {
    id: 104,
    title: 'Badminton Racket Set',
    description: 'Pair of rackets + shuttle box.',
    price: 900,
    category_id: 5,
    seller_id: 4,
    status: ITEM_STATUS.AVAILABLE,
    image_url: '',
    created_at: new Date(now - 1000 * 60 * 60 * 5).toISOString()
  },
  {
    id: 105,
    title: 'Noise Cancelling Headphones',
    description: 'Used for 6 months, with original case.',
    price: 4200,
    category_id: 1,
    seller_id: 3,
    status: ITEM_STATUS.AVAILABLE,
    image_url: '',
    created_at: new Date(now - 1000 * 60 * 90).toISOString()
  }
];

export const mockReservations = [
  {
    id: 201,
    item_id: 102,
    buyer_id: 1,
    status: RESERVATION_STATUS.ACTIVE,
    created_at: new Date(now - 1000 * 60 * 20).toISOString(),
    expires_at: new Date(now + 1000 * 60 * 20).toISOString()
  },
  {
    id: 202,
    item_id: 103,
    buyer_id: 4,
    status: RESERVATION_STATUS.COMPLETED,
    created_at: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
    expires_at: new Date(now - 1000 * 60 * 60 * 17).toISOString()
  }
];
