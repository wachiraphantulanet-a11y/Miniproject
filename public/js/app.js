// จุดเริ่มของ frontend — ผูก route ทั้งหมด + render nav ตาม role ที่ login

const NAV_ITEMS = [
  { path: '/dashboard', label: 'ภาพรวม', roles: ['admin', 'staff', 'owner'] },
  { path: '/varieties', label: 'พันธุ์มะม่วง', roles: ['admin', 'staff', 'owner'] },
  { path: '/parent-trees', label: 'ต้นพ่อ-แม่พันธุ์', roles: ['admin', 'staff', 'owner'] },
  { path: '/breeding-plans', label: 'แผนการเพาะพันธุ์', roles: ['admin', 'staff', 'owner'] },
  { path: '/pollinations', label: 'ผสมเกสร', roles: ['admin', 'staff', 'owner'] },
  { path: '/fruit-sets', label: 'การติดผล', roles: ['admin', 'staff', 'owner'] },
  { path: '/seeds', label: 'เมล็ดพันธุ์', roles: ['admin', 'staff', 'owner'] },
  { path: '/seedlings', label: 'ต้นกล้า', roles: ['admin', 'staff', 'owner'] },
  { path: '/care-records', label: 'การดูแล', roles: ['admin', 'staff', 'owner'] },
  { path: '/pest-disease', label: 'โรค/แมลง', roles: ['admin', 'staff', 'owner'] },
  { path: '/quality-evaluations', label: 'ประเมินคุณภาพ', roles: ['admin', 'staff', 'owner'] },
  { path: '/reports', label: 'รายงาน', roles: ['admin', 'staff', 'owner'] },
  { path: '/users', label: 'ผู้ใช้งาน', roles: ['admin'] },
];

function renderNav() {
  const navEl = document.getElementById('nav');
  const userBarEl = document.getElementById('user-bar');

  if (!auth.isLoggedIn()) {
    navEl.innerHTML = '';
    userBarEl.innerHTML = '';
    return;
  }

  const user = auth.getUser();
  const currentPath = (window.location.hash.replace(/^#/, '') || '/dashboard').split('?')[0];

  navEl.innerHTML = NAV_ITEMS
    .filter((item) => item.roles.includes(user.role))
    .map((item) => `<a href="#${item.path}" class="${currentPath === item.path ? 'active' : ''}">${item.label}</a>`)
    .join('');

  userBarEl.innerHTML = `
    <span>${escapeHtml(user.fullName)} (${escapeHtml(user.role)})</span>
    <button type="button" id="logout-btn">ออกจากระบบ</button>
  `;
  userBarEl.querySelector('#logout-btn').addEventListener('click', auth.logout);
}

router.register('/login', renderLogin, { publicRoute: true });
router.register('/dashboard', renderDashboard);
router.register('/varieties', renderResourceView('varieties'));
router.register('/parent-trees', renderResourceView('parentTrees'));
router.register('/breeding-plans', renderBreedingPlansList);
router.register('/breeding-plans/detail', renderBreedingPlanDetail);
router.register('/pollinations', renderResourceView('pollinations'));
router.register('/fruit-sets', renderResourceView('fruitSets'));
router.register('/seeds', renderResourceView('seeds'));
router.register('/seedlings', renderResourceView('seedlings'));
router.register('/care-records', renderResourceView('careRecords'));
router.register('/pest-disease', renderResourceView('pestDisease'));
router.register('/quality-evaluations', renderQualityEvaluationsList);
router.register('/quality-evaluations/detail', renderQualityEvaluationDetail);
router.register('/reports', renderReports);
router.register('/users', renderUsers);
router.register('/not-found', (container) => {
  container.innerHTML = '<p class="error">ไม่พบหน้านี้</p>';
});

router.start();
