import { mockUsers, mockCategories, mockItems, mockReservations } from './mockData';
import { ITEM_STATUS, RESERVATION_STATUS } from '../constants/status';

let nextItemId = 1000;
let nextReservationId = 5000;

const delay = (ms = 180) => new Promise(resolve => setTimeout(resolve, ms));

const findUser = (id) => mockUsers.find(user => user.id === Number(id));
const findCategory = (id) => mockCategories.find(category => category.id === Number(id));

const enrichItem = (item) => {
  const seller = findUser(item.seller_id);
  const buyer = item.buyer_id ? findUser(item.buyer_id) : null;
  const category = findCategory(item.category_id);

  return {
    ...item,
    seller_name: seller?.name,
    seller_email: seller?.email,
    seller_mobile: seller?.mobile,
    seller_hostel: seller?.hostel,
    seller_room: seller?.room,
    buyer_name: buyer?.name,
    buyer_mobile: buyer?.mobile,
    buyer_hostel: buyer?.hostel,
    buyer_room: buyer?.room,
    category_name: category?.name || 'Other'
  };
};

const enrichReservation = (reservation) => {
  const item = mockItems.find(entry => entry.id === reservation.item_id);
  const buyer = findUser(reservation.buyer_id);
  const seller = item ? findUser(item.seller_id) : null;
  const category = item ? findCategory(item.category_id) : null;

  return {
    ...reservation,
    item_title: item?.title,
    item_price: item?.price,
    item_image_url: item?.image_url,
    category_name: category?.name,
    seller_name: seller?.name,
    seller_mobile: seller?.mobile,
    seller_hostel: seller?.hostel,
    seller_room: seller?.room,
    buyer_name: buyer?.name,
    buyer_mobile: buyer?.mobile,
    buyer_hostel: buyer?.hostel,
    buyer_room: buyer?.room
  };
};

const parseQuery = (endpoint) => {
  const [, rawQuery = ''] = endpoint.split('?');
  return new URLSearchParams(rawQuery);
};

const notFound = (message = 'Not found') => {
  throw new Error(message);
};

const badRequest = (message) => {
  throw new Error(message);
};

export async function fetchMockAPI(endpoint, options = {}) {
  await delay();

  const method = options.method || 'GET';
  const payload = options.body ? JSON.parse(options.body) : {};

  if (endpoint === '/users/' && method === 'GET') {
    return [...mockUsers];
  }

  const userMatch = endpoint.match(/^\/users\/(\d+)$/);
  if (userMatch && method === 'GET') {
    const user = mockUsers.find(entry => entry.id === Number(userMatch[1]));
    if (!user) notFound('User not found');
    return user;
  }

  if (endpoint.startsWith('/categories/')) {
    if (endpoint === '/categories/root' && method === 'GET') {
      return mockCategories.filter(category => category.parent_id === null);
    }

    if ((endpoint === '/categories/' || endpoint.startsWith('/categories/?')) && method === 'GET') {
      const params = parseQuery(endpoint);
      const parentId = params.get('parent_id');
      if (!parentId) return [...mockCategories];
      return mockCategories.filter(category => String(category.parent_id) === String(parentId));
    }

    const categoryMatch = endpoint.match(/^\/categories\/(\d+)$/);
    if (categoryMatch && method === 'GET') {
      const category = mockCategories.find(entry => entry.id === Number(categoryMatch[1]));
      if (!category) notFound('Category not found');
      return category;
    }
  }

  if (endpoint.startsWith('/items/')) {
    if (endpoint === '/items/recently-listed' && method === 'GET') {
      return [...mockItems].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(enrichItem);
    }

    if (endpoint.startsWith('/items/?') || endpoint === '/items/') {
      const params = parseQuery(endpoint);
      const categoryId = params.get('category_id');
      const status = params.get('status');
      const sellerId = params.get('seller_id');
      const excludeSellerId = params.get('exclude_seller_id');

      return mockItems
        .filter(item => !categoryId || String(item.category_id) === String(categoryId))
        .filter(item => !status || item.status === status)
        .filter(item => !sellerId || String(item.seller_id) === String(sellerId))
        .filter(item => !excludeSellerId || String(item.seller_id) !== String(excludeSellerId))
        .map(enrichItem);
    }

    if (endpoint === '/items/' && method === 'POST') {
      const newItem = {
        id: ++nextItemId,
        title: payload.title,
        description: payload.description,
        price: Number(payload.price),
        category_id: Number(payload.category_id),
        seller_id: Number(payload.seller_id),
        image_url: payload.image_url || '',
        status: ITEM_STATUS.AVAILABLE,
        created_at: new Date().toISOString()
      };
      mockItems.push(newItem);
      return enrichItem(newItem);
    }

    const soldMatch = endpoint.match(/^\/items\/(\d+)\/sold$/);
    if (soldMatch && method === 'POST') {
      const item = mockItems.find(entry => entry.id === Number(soldMatch[1]));
      if (!item) notFound('Item not found');
      if (item.seller_id !== Number(payload.seller_id)) badRequest('Only seller can confirm the sale');
      if (item.status !== ITEM_STATUS.RESERVED) badRequest('Only reserved items can be marked sold');

      const reservation = mockReservations.find(r => r.item_id === item.id && r.status === RESERVATION_STATUS.ACTIVE);
      if (!reservation) badRequest('No active reservation found');

      item.status = ITEM_STATUS.SOLD;
      item.buyer_id = reservation.buyer_id;
      reservation.status = RESERVATION_STATUS.COMPLETED;
      return enrichItem(item);
    }

    const itemMatch = endpoint.match(/^\/items\/(\d+)$/);
    if (itemMatch && method === 'GET') {
      const item = mockItems.find(entry => entry.id === Number(itemMatch[1]));
      if (!item) notFound('Item not found');
      return enrichItem(item);
    }
  }

  if (endpoint.startsWith('/reservations/')) {
    if (endpoint.startsWith('/reservations/?') || endpoint === '/reservations/') {
      const params = parseQuery(endpoint);
      const itemId = params.get('item_id');
      const buyerId = params.get('buyer_id');
      const status = params.get('status');

      return mockReservations
        .filter(r => !itemId || String(r.item_id) === String(itemId))
        .filter(r => !buyerId || String(r.buyer_id) === String(buyerId))
        .filter(r => !status || r.status === status)
        .map(enrichReservation);
    }

    if (endpoint === '/reservations/' && method === 'POST') {
      const item = mockItems.find(entry => entry.id === Number(payload.item_id));
      if (!item) notFound('Item not found');
      if (item.status !== ITEM_STATUS.AVAILABLE) badRequest('Item is not available for reservation');
      if (item.seller_id === Number(payload.buyer_id)) badRequest('You cannot reserve your own item');

      const reservation = {
        id: ++nextReservationId,
        item_id: item.id,
        buyer_id: Number(payload.buyer_id),
        status: RESERVATION_STATUS.ACTIVE,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };

      mockReservations.push(reservation);
      item.status = ITEM_STATUS.RESERVED;
      item.buyer_id = reservation.buyer_id;
      return enrichReservation(reservation);
    }

    const cancelMatch = endpoint.match(/^\/reservations\/(\d+)\/cancel$/);
    if (cancelMatch && method === 'POST') {
      const reservation = mockReservations.find(entry => entry.id === Number(cancelMatch[1]));
      if (!reservation) notFound('Reservation not found');

      reservation.status = RESERVATION_STATUS.CANCELLED;
      const item = mockItems.find(entry => entry.id === reservation.item_id);
      if (item && item.status === ITEM_STATUS.RESERVED) {
        item.status = ITEM_STATUS.AVAILABLE;
        item.buyer_id = null;
      }

      return enrichReservation(reservation);
    }

    const confirmMatch = endpoint.match(/^\/reservations\/(\d+)\/confirm$/);
    if (confirmMatch && method === 'POST') {
      const reservation = mockReservations.find(entry => entry.id === Number(confirmMatch[1]));
      if (!reservation) notFound('Reservation not found');
      reservation.status = RESERVATION_STATUS.COMPLETED;

      const item = mockItems.find(entry => entry.id === reservation.item_id);
      if (item) {
        item.status = ITEM_STATUS.SOLD;
        item.buyer_id = reservation.buyer_id;
      }

      return enrichReservation(reservation);
    }

    const reservationMatch = endpoint.match(/^\/reservations\/(\d+)$/);
    if (reservationMatch && method === 'GET') {
      const reservation = mockReservations.find(entry => entry.id === Number(reservationMatch[1]));
      if (!reservation) notFound('Reservation not found');
      return enrichReservation(reservation);
    }
  }

  throw new Error(`Mock API endpoint not implemented: ${method} ${endpoint}`);
}
