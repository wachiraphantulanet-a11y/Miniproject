const qualityEvaluationConfig = {
  title: 'ผลการประเมินคุณภาพต้นกล้า',
  endpoint: '/quality-evaluations',
  idKey: 'evaluation_id',
  codeKey: 'seedling_code',
  listPath: '/quality-evaluations',
  listColumns: [
    { key: 'evaluation_id', label: 'ID' },
    { key: 'seedling_code', label: 'ต้นกล้า' },
    { key: 'evaluation_date', label: 'วันที่ประเมิน' },
    { key: 'overall_grade', label: 'เกรด' },
  ],
  detailFields: [
    { key: 'seedling_code', label: 'ต้นกล้า' },
    { key: 'evaluation_date', label: 'วันที่ประเมิน' },
    { key: 'overall_score', label: 'คะแนนรวม' },
    { key: 'overall_grade', label: 'เกรด' },
    { key: 'notes', label: 'หมายเหตุ' },
    { key: 'created_at', label: 'สร้างเมื่อ' },
  ],
  createFields: [
    {
      key: 'seedlingId', label: 'ต้นกล้า', type: 'select', required: true,
      options: () => loadOptions('/seedlings', 'seedling_id', (r) => r.seedling_code),
    },
    { key: 'evaluationDate', label: 'วันที่ประเมิน', type: 'date', required: true },
    { key: 'overallScore', label: 'คะแนนรวม (0-100)', type: 'number' },
    {
      key: 'overallGrade', label: 'เกรด', type: 'select', required: true,
      options: [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' }, { value: 'fail', label: 'fail' }],
    },
    { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
  ],
  editFields: [
    { key: 'evaluationDate', label: 'วันที่ประเมิน', type: 'date' },
    { key: 'overallScore', label: 'คะแนนรวม (0-100)', type: 'number' },
    {
      key: 'overallGrade', label: 'เกรด', type: 'select',
      options: [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' }, { value: 'fail', label: 'fail' }],
    },
    { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
  ],
  editableStatuses: ['rejected'],
  decideRoles: ['admin', 'owner'],
};

async function renderQualityEvaluationsList(container) {
  qualityEvaluationConfig.canCreate = auth.hasRole('admin', 'staff');
  await renderWorkflowList(container, qualityEvaluationConfig);
}

async function renderQualityEvaluationDetail(container) {
  const id = router.param('id');
  await renderWorkflowDetail(container, qualityEvaluationConfig, id);
}
