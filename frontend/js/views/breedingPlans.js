const breedingPlanConfig = {
  title: 'แผนการเพาะพันธุ์',
  endpoint: '/breeding-plans',
  idKey: 'plan_id',
  codeKey: 'plan_code',
  listPath: '/breeding-plans',
  listColumns: [
    { key: 'plan_id', label: 'ID' },
    { key: 'plan_code', label: 'รหัสแผน' },
    { key: 'father_tree_code', label: 'ต้นพ่อพันธุ์' },
    { key: 'mother_tree_code', label: 'ต้นแม่พันธุ์' },
    { key: 'planned_start_date', label: 'เริ่มแผน' },
  ],
  detailFields: [
    { key: 'plan_code', label: 'รหัสแผน' },
    { key: 'father_tree_code', label: 'ต้นพ่อพันธุ์' },
    { key: 'mother_tree_code', label: 'ต้นแม่พันธุ์' },
    { key: 'objective', label: 'เป้าหมาย' },
    { key: 'planned_start_date', label: 'วันที่เริ่มแผน' },
    { key: 'planned_end_date', label: 'วันที่สิ้นสุดแผน' },
    { key: 'created_at', label: 'สร้างเมื่อ' },
  ],
  createFields: [
    { key: 'planCode', label: 'รหัสแผน', type: 'text', required: true },
    {
      key: 'fatherTreeId', label: 'ต้นพ่อพันธุ์', type: 'select', required: true,
      options: () => loadOptions('/parent-trees?treeType=father', 'tree_id', (r) => `${r.tree_code} (${r.variety_name})`),
    },
    {
      key: 'motherTreeId', label: 'ต้นแม่พันธุ์', type: 'select', required: true,
      options: () => loadOptions('/parent-trees?treeType=mother', 'tree_id', (r) => `${r.tree_code} (${r.variety_name})`),
    },
    { key: 'objective', label: 'เป้าหมายของแผน', type: 'textarea' },
    { key: 'plannedStartDate', label: 'วันที่เริ่มแผน', type: 'date' },
    { key: 'plannedEndDate', label: 'วันที่สิ้นสุดแผน', type: 'date' },
  ],
  editFields: [
    { key: 'planCode', label: 'รหัสแผน', type: 'text' },
    { key: 'objective', label: 'เป้าหมายของแผน', type: 'textarea' },
    { key: 'plannedStartDate', label: 'วันที่เริ่มแผน', type: 'date' },
    { key: 'plannedEndDate', label: 'วันที่สิ้นสุดแผน', type: 'date' },
  ],
  editableStatuses: ['draft', 'rejected'],
  decideRoles: ['admin', 'owner'],
};

async function renderBreedingPlansList(container) {
  breedingPlanConfig.canCreate = auth.hasRole('admin', 'staff');
  await renderWorkflowList(container, breedingPlanConfig);
}

async function renderBreedingPlanDetail(container) {
  const id = router.param('id');
  await renderWorkflowDetail(container, breedingPlanConfig, id);
}
