
require('dotenv').config();
const {
  sequelize, User, Contact, Lead, Deal, Activity, Meeting, DealStageHistory,
} = require('./models');

const CLEAR = process.argv.includes('--clear');

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 3600 * 1000);
const dateOnly = (n) => daysFromNow(n).toISOString().slice(0, 10);

async function seed() {
  await sequelize.authenticate();
  console.log('Database connected. Tables check/create ho rahi hain...');
  await sequelize.sync(); // sirf missing tables banata hai

  const existing = await User.count();
  if (existing > 0 && !CLEAR) {
    console.log(`\nDB me pehle se ${existing} user(s) hain. Duplicate se bachne ke liye script ruk gayi.`);
    console.log('Purana data hatakar naya daalna hai to chalayein:  node src/seedDemo.js --clear\n');
    process.exit(0);
  }

  if (CLEAR) {
    console.log('Purana data delete ho raha hai...');
    // Child tables pehle, parent tables baad me
    await Activity.destroy({ where: {} });
    await Meeting.destroy({ where: {} });
    await DealStageHistory.destroy({ where: {} });
    await Deal.destroy({ where: {} });
    await Lead.destroy({ where: {} });
    await Contact.destroy({ where: {} });
    await User.destroy({ where: {} });
  }

  // ---------------- USERS ----------------
  // create() use kiya hai taaki model ka hook password ko bcrypt se hash kare
  console.log('Users ban rahe hain...');
  const anita = await User.create({ name: 'Anita Sharma', email: 'manager@websmileindia.com', password: 'password123', role: 'admin' });
  const rahul = await User.create({ name: 'Rahul Verma', email: 'rahul@websmileindia.com', password: 'password123', role: 'sales_rep' });
  const pooja = await User.create({ name: 'Pooja Singh', email: 'pooja@websmileindia.com', password: 'password123', role: 'sales_rep' });

  // ---------------- CONTACTS ----------------
  console.log('Contacts ban rahe hain...');
  const contacts = await Contact.bulkCreate([
    { name: 'Vikram Mehta', email: 'vikram.mehta@bluepeak.in', phone: '9820011223', company: 'BluePeak Retail', jobTitle: 'Operations Head', tags: ['retail', 'vip'], notes: 'Prefers WhatsApp for quick updates.', ownerId: rahul.id },
    { name: 'Priya Nair', email: 'priya.nair@sunrisefoods.in', phone: '9845566778', company: 'Sunrise Foods', jobTitle: 'Marketing Manager', tags: ['food', 'packaging'], notes: 'Interested in eco-friendly packaging.', ownerId: rahul.id },
    { name: 'Arjun Kapoor', email: 'arjun@kapoorbuilders.com', phone: '9901122334', company: 'Kapoor Builders', jobTitle: 'Director', tags: ['construction'], notes: 'Decision maker. Meets only on weekdays.', ownerId: anita.id },
    { name: 'Sneha Reddy', email: 'sneha.reddy@zenithlabs.in', phone: '9988776655', company: 'Zenith Labs', jobTitle: 'Procurement Lead', tags: ['lab', 'amc'], notes: 'Renewal due every October.', ownerId: rahul.id },
    { name: 'Karan Malhotra', email: 'karan.m@urbanstyle.co.in', phone: '9776655443', company: 'Urban Style', jobTitle: 'Founder', tags: ['fashion', 'startup'], notes: 'Budget conscious, active on Instagram.', ownerId: rahul.id },
    { name: 'Neha Joshi', email: 'neha.joshi@grovetech.io', phone: '9812345678', company: 'Grove Tech', jobTitle: 'IT Manager', tags: ['it'], notes: 'Needs technical documentation before meetings.', ownerId: anita.id },
    { name: 'Rohit Agarwal', email: 'rohit@agarwaltextiles.com', phone: '9811122233', company: 'Agarwal Textiles', jobTitle: 'Managing Director', tags: ['textile', 'enterprise'], notes: 'Large account, referred by Vikram.', ownerId: pooja.id },
    { name: 'Meera Iyer', email: 'meera.iyer@lotusclinic.in', phone: '9890098900', company: 'Lotus Clinic', jobTitle: 'Clinic Manager', tags: ['healthcare'], notes: 'Wants a booking system with reminders.', ownerId: pooja.id },
    { name: 'Sandeep Gupta', email: 'sandeep@guptalogistics.in', phone: '9871234500', company: 'Gupta Logistics', jobTitle: 'Fleet Manager', tags: ['logistics'], notes: 'Evaluating 3 vendors.', ownerId: rahul.id },
    { name: 'Divya Menon', email: 'divya.menon@coastalcafe.in', phone: '9845012345', company: 'Coastal Cafe', jobTitle: 'Owner', tags: ['hospitality', 'small-biz'], notes: 'Opening second outlet in December.', ownerId: pooja.id },
  ], { returning: true });
  const c = Object.fromEntries(contacts.map((x) => [x.company, x]));

  // ---------------- LEADS ----------------
  console.log('Leads ban rahi hain...');
  const leads = await Lead.bulkCreate([
    { title: 'Website redesign inquiry', source: 'Website form', status: 'new', estimatedValue: 45000, contactId: c['BluePeak Retail'].id, ownerId: rahul.id },
    { title: 'Bulk packaging order', source: 'Referral', status: 'contacted', estimatedValue: 120000, contactId: c['Sunrise Foods'].id, ownerId: rahul.id },
    { title: 'Office interior consultation', source: 'Cold outreach', status: 'converted', estimatedValue: 300000, contactId: c['Kapoor Builders'].id, ownerId: anita.id },
    { title: 'Lab equipment AMC renewal', source: 'Existing customer', status: 'converted', estimatedValue: 85000, contactId: c['Zenith Labs'].id, ownerId: rahul.id },
    { title: 'Store branding package', source: 'Instagram', status: 'qualified', estimatedValue: 60000, contactId: c['Urban Style'].id, ownerId: rahul.id },
    { title: 'Network infrastructure upgrade', source: 'Referral', status: 'unqualified', estimatedValue: 200000, contactId: c['Grove Tech'].id, ownerId: anita.id },
    { title: 'ERP implementation', source: 'Trade show', status: 'converted', estimatedValue: 450000, contactId: c['Agarwal Textiles'].id, ownerId: pooja.id },
    { title: 'Patient booking app', source: 'LinkedIn', status: 'qualified', estimatedValue: 95000, contactId: c['Lotus Clinic'].id, ownerId: pooja.id },
    { title: 'Fleet tracking software', source: 'Google Ads', status: 'contacted', estimatedValue: 180000, contactId: c['Gupta Logistics'].id, ownerId: rahul.id },
    { title: 'POS and menu design', source: 'Walk-in', status: 'new', estimatedValue: 35000, contactId: c['Coastal Cafe'].id, ownerId: pooja.id },
  ], { returning: true });

  // ---------------- DEALS ----------------
  console.log('Deals ban rahi hain...');
  const dealsData = [
    { title: 'Office interior consultation', value: 300000, stage: 'proposal', probability: 60, contactId: c['Kapoor Builders'].id, leadId: leads[2].id, ownerId: anita.id, expectedCloseDate: dateOnly(15), paymentTerms: 'Net 30', discountPercent: 5, taxAmount: 54000, notes: 'Proposal sent, awaiting feedback.', path: ['new', 'contacted', 'qualified', 'proposal'] },
    { title: 'Lab equipment AMC renewal', value: 85000, stage: 'qualified', probability: 40, contactId: c['Zenith Labs'].id, leadId: leads[3].id, ownerId: rahul.id, expectedCloseDate: dateOnly(6), paymentTerms: 'Net 15', discountPercent: 0, taxAmount: 15300, notes: 'Waiting for PO approval.', path: ['new', 'contacted', 'qualified'] },
    { title: 'Annual maintenance contract', value: 150000, stage: 'won', probability: 100, contactId: c['BluePeak Retail'].id, ownerId: rahul.id, expectedCloseDate: dateOnly(-70), paymentTerms: '50% advance', discountPercent: 0, taxAmount: 27000, notes: 'Signed and onboarded.', path: ['new', 'contacted', 'qualified', 'proposal', 'won'] },
    { title: 'Signage and POS branding', value: 40000, stage: 'lost', probability: 0, contactId: c['Urban Style'].id, ownerId: rahul.id, expectedCloseDate: dateOnly(-90), paymentTerms: 'Net 30', discountPercent: 0, taxAmount: 7200, notes: 'Lost to a cheaper competitor.', path: ['new', 'contacted', 'lost'] },
    { title: 'New warehouse setup', value: 500000, stage: 'new', probability: 20, contactId: c['Sunrise Foods'].id, ownerId: rahul.id, expectedCloseDate: dateOnly(50), paymentTerms: 'Net 45', discountPercent: 10, taxAmount: 90000, notes: 'Initial requirement gathering.', path: ['new'] },
    { title: 'ERP implementation', value: 450000, stage: 'contacted', probability: 30, contactId: c['Agarwal Textiles'].id, leadId: leads[6].id, ownerId: pooja.id, expectedCloseDate: dateOnly(40), paymentTerms: 'Milestone based', discountPercent: 8, taxAmount: 81000, notes: 'Demo scheduled next week.', path: ['new', 'contacted'] },
    { title: 'Cloud hosting migration', value: 220000, stage: 'won', probability: 100, contactId: c['Grove Tech'].id, ownerId: anita.id, expectedCloseDate: dateOnly(-35), paymentTerms: 'Net 30', discountPercent: 3, taxAmount: 39600, notes: 'Migration completed successfully.', path: ['new', 'qualified', 'proposal', 'won'] },
    { title: 'Cafe loyalty app', value: 70000, stage: 'proposal', probability: 55, contactId: c['Coastal Cafe'].id, ownerId: pooja.id, expectedCloseDate: dateOnly(29), paymentTerms: 'Net 15', discountPercent: 0, taxAmount: 12600, notes: 'Needs revised pricing.', path: ['new', 'contacted', 'qualified', 'proposal'] },
  ];
  const deals = await Deal.bulkCreate(dealsData.map(({ path, ...d }) => d), { returning: true });
  const d = Object.fromEntries(deals.map((x) => [x.title, x]));

  // ---------------- DEAL STAGE HISTORY ----------------
  const history = [];
  dealsData.forEach((dd, idx) => {
    const n = dd.path.length;
    dd.path.forEach((stage, i) => {
      history.push({
        dealId: deals[idx].id,
        fromStage: i === 0 ? null : dd.path[i - 1],
        toStage: stage,
        changedAt: daysFromNow(-(n - i) * 6),
      });
    });
  });
  await DealStageHistory.bulkCreate(history);

  // ---------------- ACTIVITIES ----------------
  console.log('Activities aur meetings ban rahi hain...');
  await Activity.bulkCreate([
    { type: 'call', content: 'Discussed budget range, sending proposal by Friday.', relatedType: 'deal', relatedId: d['Office interior consultation'].id, completed: true },
    { type: 'note', content: 'Client prefers WhatsApp over email for quick updates.', relatedType: 'contact', relatedId: c['BluePeak Retail'].id },
    { type: 'task', content: 'Follow up on AMC renewal terms.', relatedType: 'deal', relatedId: d['Lab equipment AMC renewal'].id, dueAt: daysFromNow(3) },
    { type: 'email', content: 'Sent updated ERP feature list and pricing sheet.', relatedType: 'deal', relatedId: d['ERP implementation'].id, completed: true },
    { type: 'call', content: 'Intro call done. Needs a demo with the IT team.', relatedType: 'lead', relatedId: leads[6].id, completed: true },
    { type: 'task', content: 'Send revised quotation for loyalty app.', relatedType: 'deal', relatedId: d['Cafe loyalty app'].id, dueAt: daysFromNow(2) },
    { type: 'meeting', content: 'On-site visit to review warehouse layout.', relatedType: 'deal', relatedId: d['New warehouse setup'].id, dueAt: daysFromNow(7) },
    { type: 'note', content: 'Competitor quoted 15% lower. Consider a discount.', relatedType: 'deal', relatedId: d['Signage and POS branding'].id, completed: true },
    { type: 'task', content: 'Share case studies with Lotus Clinic.', relatedType: 'lead', relatedId: leads[7].id, dueAt: daysFromNow(1) },
    { type: 'call', content: 'Left voicemail, will retry tomorrow.', relatedType: 'lead', relatedId: leads[8].id },
    { type: 'email', content: 'Welcome email sent after contract signing.', relatedType: 'deal', relatedId: d['Cloud hosting migration'].id, completed: true },
    { type: 'note', content: 'Owner is opening a second outlet in December.', relatedType: 'contact', relatedId: c['Coastal Cafe'].id },
  ]);

  // ---------------- MEETINGS ----------------
  await Meeting.bulkCreate([
    { title: 'ERP product demo', notes: 'Show inventory and billing modules.', scheduledAt: daysFromNow(5), durationMinutes: 60, location: 'Google Meet', status: 'scheduled', relatedType: 'deal', relatedId: d['ERP implementation'].id, ownerId: pooja.id },
    { title: 'Proposal walkthrough', notes: 'Review scope and timeline.', scheduledAt: daysFromNow(2), durationMinutes: 45, location: 'Kapoor Builders Office', status: 'scheduled', relatedType: 'deal', relatedId: d['Office interior consultation'].id, ownerId: anita.id },
    { title: 'AMC renewal discussion', notes: 'Finalize renewal terms.', scheduledAt: daysFromNow(4), durationMinutes: 30, location: 'Zoom', status: 'scheduled', relatedType: 'deal', relatedId: d['Lab equipment AMC renewal'].id, ownerId: rahul.id },
    { title: 'Kickoff meeting', notes: 'Project kickoff with IT team.', scheduledAt: daysFromNow(-35), durationMinutes: 90, location: 'Grove Tech HQ', status: 'completed', relatedType: 'deal', relatedId: d['Cloud hosting migration'].id, ownerId: anita.id },
    { title: 'Requirement discovery call', notes: 'Understand clinic workflow.', scheduledAt: daysFromNow(-3), durationMinutes: 30, location: 'Phone', status: 'completed', relatedType: 'lead', relatedId: leads[7].id, ownerId: pooja.id },
    { title: 'Pricing negotiation', notes: 'Client cancelled, rescheduling needed.', scheduledAt: daysFromNow(-1), durationMinutes: 30, location: 'Cafe Premises', status: 'cancelled', relatedType: 'deal', relatedId: d['Cafe loyalty app'].id, ownerId: pooja.id },
  ]);

  console.log('\nDone! Demo data add ho gaya.');
  console.log('Login credentials (password sabke liye: password123):');
  console.log('  Admin     -> manager@websmileindia.com');
  console.log('  Sales Rep -> rahul@websmileindia.com');
  console.log('  Sales Rep -> pooja@websmileindia.com');
  console.log(`\nCreated: 3 users, ${contacts.length} contacts, ${leads.length} leads, ${deals.length} deals, ${history.length} stage-history rows, 12 activities, 6 meetings.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});