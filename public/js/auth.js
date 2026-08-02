// จัดการสถานะการ login ฝั่ง client (เก็บ token/user ใน localStorage)
const auth = {
  getToken: () => localStorage.getItem('token'),
  getUser: () => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },
  isLoggedIn: () => !!localStorage.getItem('token'),
  hasRole: (...roles) => {
    const user = auth.getUser();
    return !!user && roles.includes(user.role);
  },
  login: async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.hash = '#/login';
  },
};
