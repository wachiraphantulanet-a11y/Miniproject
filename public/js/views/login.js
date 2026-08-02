function renderLogin(container) {
  container.innerHTML = `
    <div class="login-box">
      <h2>เข้าสู่ระบบ</h2>
      <p class="subtitle">ระบบจัดการการเพาะพันธุ์มะม่วง</p>
      <form id="login-form">
        <label class="form-field">
          <span>ชื่อผู้ใช้</span>
          <input type="text" name="username" required autofocus />
        </label>
        <label class="form-field">
          <span>รหัสผ่าน</span>
          <input type="password" name="password" required />
        </label>
        <button type="submit">เข้าสู่ระบบ</button>
        <p id="login-error" class="error"></p>
      </form>
    </div>
  `;

  container.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = container.querySelector('#login-error');
    errorEl.textContent = '';
    const formData = new FormData(e.target);
    try {
      await auth.login(formData.get('username'), formData.get('password'));
      window.location.hash = '#/dashboard';
      router.resolve();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}
