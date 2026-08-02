// Config ของ resource ที่ใช้ generic CRUD component (crud.js) ร่วมกัน
// สิทธิ์เขียน: admin, staff (บังคับจริงที่ backend อยู่แล้ว ที่นี่แค่ซ่อน/แสดง UI ให้เหมาะสม)

function canWriteMasterData() {
  return auth.hasRole('admin', 'staff');
}

async function loadOptions(endpoint, valueKey, labelFn) {
  const rows = await api.get(endpoint);
  return rows.map((r) => ({ value: r[valueKey], label: labelFn(r) }));
}

const resourceConfigs = {
  varieties: {
    title: 'พันธุ์มะม่วง',
    endpoint: '/varieties',
    idKey: 'variety_id',
    listColumns: [
      { key: 'variety_id', label: 'ID' },
      { key: 'variety_name', label: 'ชื่อพันธุ์' },
      { key: 'taste', label: 'รสชาติ' },
      { key: 'color', label: 'สี' },
      { key: 'avg_size_g', label: 'ขนาดเฉลี่ย (ก.)' },
      { key: 'harvest_days', label: 'ระยะเก็บเกี่ยว (วัน)' },
    ],
    fields: [
      { key: 'varietyName', label: 'ชื่อพันธุ์', type: 'text', required: true },
      { key: 'taste', label: 'รสชาติ', type: 'text' },
      { key: 'color', label: 'สี', type: 'text' },
      { key: 'avgSizeG', label: 'ขนาดเฉลี่ย (กรัม)', type: 'number' },
      { key: 'harvestDays', label: 'ระยะเก็บเกี่ยว (วัน)', type: 'number' },
      { key: 'diseaseResistance', label: 'ความต้านทานโรค', type: 'text' },
      { key: 'suitableClimate', label: 'ภูมิอากาศที่เหมาะสม', type: 'text' },
      { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    canDelete: true,
  },

  parentTrees: {
    title: 'ต้นพ่อ-แม่พันธุ์',
    endpoint: '/parent-trees',
    idKey: 'tree_id',
    listColumns: [
      { key: 'tree_id', label: 'ID' },
      { key: 'tree_code', label: 'รหัสต้น' },
      { key: 'tree_type', label: 'ประเภท' },
      { key: 'variety_name', label: 'พันธุ์' },
      { key: 'planted_date', label: 'วันที่ปลูก' },
      { key: 'location', label: 'ตำแหน่ง' },
      { key: 'status', label: 'สถานะ' },
    ],
    createFields: [
      { key: 'treeCode', label: 'รหัสต้น', type: 'text', required: true },
      {
        key: 'treeType', label: 'ประเภท', type: 'select', required: true,
        options: [{ value: 'father', label: 'ต้นพ่อพันธุ์' }, { value: 'mother', label: 'ต้นแม่พันธุ์' }],
      },
      {
        key: 'varietyId', label: 'พันธุ์', type: 'select', required: true,
        options: () => loadOptions('/varieties', 'variety_id', (r) => r.variety_name),
      },
      { key: 'plantedDate', label: 'วันที่ปลูก', type: 'date' },
      { key: 'location', label: 'ตำแหน่ง', type: 'text' },
      { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    editFields: [
      { key: 'treeCode', label: 'รหัสต้น', type: 'text' },
      { key: 'plantedDate', label: 'วันที่ปลูก', type: 'date' },
      { key: 'location', label: 'ตำแหน่ง', type: 'text' },
      {
        key: 'status', label: 'สถานะ', type: 'select',
        options: [{ value: 'active', label: 'active' }, { value: 'inactive', label: 'inactive' }, { value: 'removed', label: 'removed' }],
      },
      { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    canDelete: false,
  },

  pollinations: {
    title: 'การผสมเกสร',
    endpoint: '/pollinations',
    idKey: 'pollination_id',
    listColumns: [
      { key: 'pollination_id', label: 'ID' },
      { key: 'plan_code', label: 'รหัสแผน' },
      { key: 'pollination_date', label: 'วันที่ผสมเกสร' },
      { key: 'flower_count', label: 'จำนวนดอก' },
      { key: 'method', label: 'วิธีการ' },
    ],
    createFields: [
      {
        key: 'planId', label: 'แผนการเพาะพันธุ์ (ต้อง approved)', type: 'select', required: true,
        options: () => loadOptions('/breeding-plans?status=approved', 'plan_id', (r) => `${r.plan_code} (${r.father_tree_code} x ${r.mother_tree_code})`),
      },
      { key: 'pollinationDate', label: 'วันที่ผสมเกสร', type: 'date', required: true },
      { key: 'flowerCount', label: 'จำนวนดอก', type: 'number' },
      { key: 'method', label: 'วิธีการ', type: 'text' },
      { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    editFields: [
      { key: 'pollinationDate', label: 'วันที่ผสมเกสร', type: 'date' },
      { key: 'flowerCount', label: 'จำนวนดอก', type: 'number' },
      { key: 'method', label: 'วิธีการ', type: 'text' },
      { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    canDelete: false,
  },

  fruitSets: {
    title: 'การติดผล',
    endpoint: '/fruit-sets',
    idKey: 'fruit_set_id',
    listColumns: [
      { key: 'fruit_set_id', label: 'ID' },
      { key: 'plan_id', label: 'แผน ID' },
      { key: 'observed_date', label: 'วันที่สังเกต' },
      { key: 'fruit_count', label: 'จำนวนผล' },
      { key: 'fruit_set_rate', label: 'อัตราติดผล (%)' },
    ],
    createFields: [
      {
        key: 'pollinationId', label: 'บันทึกการผสมเกสร', type: 'select', required: true,
        options: () => loadOptions('/pollinations', 'pollination_id', (r) => `#${r.pollination_id} - ${r.plan_code} (${r.pollination_date})`),
      },
      { key: 'observedDate', label: 'วันที่สังเกต', type: 'date', required: true },
      { key: 'fruitCount', label: 'จำนวนผล', type: 'number' },
      { key: 'fruitSetRate', label: 'อัตราติดผล % (เว้นว่างให้คำนวณอัตโนมัติ)', type: 'number' },
      { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    editFields: [
      { key: 'observedDate', label: 'วันที่สังเกต', type: 'date' },
      { key: 'fruitCount', label: 'จำนวนผล', type: 'number' },
      { key: 'fruitSetRate', label: 'อัตราติดผล %', type: 'number' },
      { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    canDelete: false,
  },

  seeds: {
    title: 'เมล็ดพันธุ์',
    endpoint: '/seeds',
    idKey: 'seed_id',
    listColumns: [
      { key: 'seed_id', label: 'ID' },
      { key: 'fruit_set_id', label: 'การติดผล ID' },
      { key: 'collected_date', label: 'วันที่เก็บ' },
      { key: 'seed_count', label: 'จำนวนเมล็ด' },
      { key: 'quality_grade', label: 'เกรด' },
    ],
    createFields: [
      {
        key: 'fruitSetId', label: 'บันทึกการติดผล', type: 'select', required: true,
        options: () => loadOptions('/fruit-sets', 'fruit_set_id', (r) => `#${r.fruit_set_id} (${r.observed_date})`),
      },
      { key: 'collectedDate', label: 'วันที่เก็บ', type: 'date' },
      { key: 'seedCount', label: 'จำนวนเมล็ด', type: 'number' },
      { key: 'qualityGrade', label: 'เกรด', type: 'text' },
      { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    editFields: [
      { key: 'collectedDate', label: 'วันที่เก็บ', type: 'date' },
      { key: 'seedCount', label: 'จำนวนเมล็ด', type: 'number' },
      { key: 'qualityGrade', label: 'เกรด', type: 'text' },
      { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    canDelete: false,
  },

  seedlings: {
    title: 'ต้นกล้า',
    endpoint: '/seedlings',
    idKey: 'seedling_id',
    listColumns: [
      { key: 'seedling_id', label: 'ID' },
      { key: 'seedling_code', label: 'รหัสต้นกล้า' },
      { key: 'seed_id', label: 'เมล็ด ID' },
      { key: 'germination_date', label: 'วันที่งอก' },
      { key: 'current_status', label: 'สถานะ' },
    ],
    createFields: [
      {
        key: 'seedId', label: 'เมล็ดพันธุ์', type: 'select', required: true,
        options: () => loadOptions('/seeds', 'seed_id', (r) => `#${r.seed_id} (${r.collected_date || 'ไม่ระบุวันที่'})`),
      },
      { key: 'seedlingCode', label: 'รหัสต้นกล้า', type: 'text', required: true },
      { key: 'germinationDate', label: 'วันที่งอก', type: 'date' },
      { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    editFields: [
      { key: 'seedlingCode', label: 'รหัสต้นกล้า', type: 'text' },
      { key: 'germinationDate', label: 'วันที่งอก', type: 'date' },
      {
        key: 'currentStatus', label: 'สถานะ', type: 'select',
        options: ['growing', 'ready_for_evaluation', 'passed', 'rejected', 'sold', 'disposed'].map((v) => ({ value: v, label: v })),
      },
      { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    canDelete: false,
  },

  careRecords: {
    title: 'การดูแล/เจริญเติบโต',
    endpoint: '/care-records',
    idKey: 'care_id',
    listColumns: [
      { key: 'care_id', label: 'ID' },
      { key: 'seedling_code', label: 'ต้นกล้า' },
      { key: 'care_date', label: 'วันที่ดูแล' },
      { key: 'activity_type', label: 'กิจกรรม' },
      { key: 'height_cm', label: 'ความสูง (ซม.)' },
      { key: 'leaf_count', label: 'จำนวนใบ' },
    ],
    createFields: [
      {
        key: 'seedlingId', label: 'ต้นกล้า', type: 'select', required: true,
        options: () => loadOptions('/seedlings', 'seedling_id', (r) => r.seedling_code),
      },
      { key: 'careDate', label: 'วันที่ดูแล', type: 'date', required: true },
      { key: 'activityType', label: 'กิจกรรม', type: 'text' },
      { key: 'heightCm', label: 'ความสูง (ซม.)', type: 'number' },
      { key: 'leafCount', label: 'จำนวนใบ', type: 'number' },
      { key: 'growthNote', label: 'บันทึกการเจริญเติบโต', type: 'textarea' },
    ],
    editFields: [
      { key: 'careDate', label: 'วันที่ดูแล', type: 'date' },
      { key: 'activityType', label: 'กิจกรรม', type: 'text' },
      { key: 'heightCm', label: 'ความสูง (ซม.)', type: 'number' },
      { key: 'leafCount', label: 'จำนวนใบ', type: 'number' },
      { key: 'growthNote', label: 'บันทึกการเจริญเติบโต', type: 'textarea' },
    ],
    canDelete: false,
  },

  pestDisease: {
    title: 'ปัญหาโรคและแมลง',
    endpoint: '/pest-disease-records',
    idKey: 'record_id',
    listColumns: [
      { key: 'record_id', label: 'ID' },
      { key: 'seedling_code', label: 'ต้นกล้า' },
      { key: 'found_date', label: 'วันที่พบ' },
      { key: 'issue_type', label: 'ประเภท' },
      { key: 'issue_name', label: 'ชื่อปัญหา' },
      { key: 'severity', label: 'ความรุนแรง' },
      { key: 'status', label: 'สถานะ' },
    ],
    createFields: [
      {
        key: 'seedlingId', label: 'ต้นกล้า', type: 'select', required: true,
        options: () => loadOptions('/seedlings', 'seedling_id', (r) => r.seedling_code),
      },
      {
        key: 'careId', label: 'รอบการดูแลที่พบ (ไม่บังคับ)', type: 'select',
        options: () => loadOptions('/care-records', 'care_id', (r) => `#${r.care_id} - ${r.seedling_code} (${r.care_date})`),
      },
      { key: 'foundDate', label: 'วันที่พบ', type: 'date', required: true },
      {
        key: 'issueType', label: 'ประเภท', type: 'select', required: true,
        options: [{ value: 'disease', label: 'โรค' }, { value: 'pest', label: 'แมลง' }],
      },
      { key: 'issueName', label: 'ชื่อปัญหา', type: 'text' },
      {
        key: 'severity', label: 'ความรุนแรง', type: 'select',
        options: [{ value: 'low', label: 'ต่ำ' }, { value: 'medium', label: 'ปานกลาง' }, { value: 'high', label: 'สูง' }],
      },
      { key: 'treatment', label: 'การรักษา', type: 'textarea' },
    ],
    editFields: [
      { key: 'issueName', label: 'ชื่อปัญหา', type: 'text' },
      {
        key: 'severity', label: 'ความรุนแรง', type: 'select',
        options: [{ value: 'low', label: 'ต่ำ' }, { value: 'medium', label: 'ปานกลาง' }, { value: 'high', label: 'สูง' }],
      },
      { key: 'treatment', label: 'การรักษา', type: 'textarea' },
      {
        key: 'status', label: 'สถานะ', type: 'select',
        options: [{ value: 'open', label: 'open' }, { value: 'treated', label: 'treated' }, { value: 'resolved', label: 'resolved' }],
      },
    ],
    canDelete: false,
  },
};

function renderResourceView(key) {
  return async (container) => {
    const config = resourceConfigs[key];
    const writable = canWriteMasterData();
    await renderCrudView(container, {
      title: config.title,
      endpoint: config.endpoint,
      idKey: config.idKey,
      listColumns: config.listColumns,
      createFields: config.createFields || config.fields,
      editFields: config.editFields || config.fields,
      canCreate: writable,
      canEdit: writable,
      canDelete: writable && !!config.canDelete,
    });
  };
}
