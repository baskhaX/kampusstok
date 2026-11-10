// state.js - Reaktif Durum Yönetimi

class AppState {
  constructor() {
    this.user = null;
    this.cartCount = 0;
    this.unreadNotifications = 0;
    this.listeners = new Set();
  }

  setUser(user) {
    this.user = user;
    this.notify();
  }

  setCartCount(count) {
    this.cartCount = count;
    this.notify();
  }

  setUnreadNotifications(count) {
    this.unreadNotifications = count;
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this);
      } catch (err) {
        console.error('State listener hatası:', err);
      }
    }
  }
}

export const state = new AppState();
export default state;
