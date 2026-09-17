/**
 * Dummy data seeder.
 * Run from the server/ folder with:  node src/seed.js
 * Safe to run multiple times on a fresh dev DB - it clears old rows first.
 */
require('dotenv').config();
const { sequelize, User, Contact, Lead, Deal, Activity, DealStageHistory } = require('./models');

async function seed() {
  await sequelize.authenticate();
  console.log('Connected. Syncing tables...');
  await sequelize.sync(); // won't drop columns, just ensures tables exist

  console.log('Clearing existing demo data...');
  // Plain DELETE (not TRUNCATE) so MySQL doesn't complain about foreign keys.
  // Order matters: delete child tables before the tables they reference.
  await Activity.destroy({ where: {} });
  await DealStageHistory.destroy({ where: {} });
  await Deal.destroy({ where: {} });
  await Lead.destroy({ where: {} });
  await Contact.destroy({ where: {} });
  await User.destroy({ where: {} });

  console.log('Creating users...');
  const manager = await User.create({
    name: 'Anita Sharma',
    email: 'manager@websmileindia.com',
    password: 'password123',
    role: 'admin',
  });

  const rep = await User.create({
    name: 'Rahul Verma',
    email: 'rahul@websmileindia.com',
    password: 'password123',
    role: 'sales_rep',
  });

  console.log('Creating contacts...');
  const contactsData = [
    { name: 'Vikram Mehta', email: 'vikram.mehta@bluepeak.in', phone: '9820011223', company: 'BluePeak Retail', jobTitle: 'Operations Head', ownerId: rep.id },
    { name: 'Priya Nair', email: 'priya.nair@sunrisefoods.in', phone: '9845566778', company: 'Sunrise Foods', jobTitle: 'Marketing Manager', ownerId: rep.id },
    { name: 'Arjun Kapoor', email: 'arjun@kapoorbuilders.com', phone: '9901122334', company: 'Kapoor Builders', jobTitle: 'Director', ownerId: manager.id },
    { name: 'Sneha Reddy', email: 'sneha.reddy@zenithlabs.in', phone: '9988776655', company: 'Zenith Labs', jobTitle: 'Procurement Lead', ownerId: rep.id },
    { name: 'Karan Malhotra', email: 'karan.m@urbanstyle.co.in', phone: '9776655443', company: 'Urban Style', jobTitle: 'Founder', ownerId: rep.id },
    { name: 'Neha Joshi', email: 'neha.joshi@grovetech.io', phone: '9812345678', company: 'Grove Tech', jobTitle: 'IT Manager', ownerId: manager.id },
  ];
  const contacts = await Contact.bulkCreate(contactsData, { returning: true });
  const byCompany = Object.fromEntries(contacts.map((c) => [c.company, c]));

  console.log('Creating leads...');
  const leadsData = [
    { title: 'Website redesign inquiry', source: 'Website form', status: 'new', estimatedValue: 45000, contactId: byCompany['BluePeak Retail'].id, ownerId: rep.id },
    { title: 'Bulk packaging order', source: 'Referral', status: 'contacted', estimatedValue: 120000, contactId: byCompany['Sunrise Foods'].id, ownerId: rep.id },
    { title: 'Office interior consultation', source: 'Cold outreach', status: 'qualified', estimatedValue: 300000, contactId: byCompany['Kapoor Builders'].id, ownerId: manager.id },
    { title: 'Lab equipment AMC renewal', source: 'Existing customer', status: 'qualified', estimatedValue: 85000, contactId: byCompany['Zenith Labs'].id, ownerId: rep.id },
    { title: 'Store branding package', source: 'Instagram', status: 'new', estimatedValue: 60000, contactId: byCompany['Urban Style'].id, ownerId: rep.id },
    { title: 'Network infrastructure upgrade', source: 'Referral', status: 'unqualified', estimatedValue: 200000, contactId: byCompany['Grove Tech'].id, ownerId: manager.id },
  ];
  const leads = await Lead.bulkCreate(leadsData, { returning: true });

  console.log('Creating deals (some converted from leads, some standalone)...');
  const dealsData = [
    { title: 'Office interior consultation', value: 300000, stage: 'proposal', probability: 60, contactId: byCompany['Kapoor Builders'].id, leadId: leads[2].id, ownerId: manager.id, expectedCloseDate: '2026-10-15' },
    { title: 'Lab equipment AMC renewal', value: 85000, stage: 'qualified', probability: 40, contactId: byCompany['Zenith Labs'].id, leadId: leads[3].id, ownerId: rep.id, expectedCloseDate: '2026-10-05' },
    { title: 'Annual maintenance contract', value: 150000, stage: 'won', probability: 100, contactId: byCompany['BluePeak Retail'].id, ownerId: rep.id, expectedCloseDate: '2026-08-20' },
    { title: 'Signage and POS branding', value: 40000, stage: 'lost', probability: 0, contactId: byCompany['Urban Style'].id, ownerId: rep.id, expectedCloseDate: '2026-07-30' },
    { title: 'New warehouse setup', value: 500000, stage: 'new', probability: 20, contactId: byCompany['Sunrise Foods'].id, ownerId: rep.id, expectedCloseDate: '2026-11-30' },
  ];
  // Mark the converted leads as "converted" to mirror the real convert flow
  await leads[2].update({ status: 'converted' });
  await leads[3].update({ status: 'converted' });

  const deals = await Deal.bulkCreate(dealsData, { returning: true });
  await DealStageHistory.bulkCreate(
    deals.map((d) => ({ dealId: d.id, fromStage: null, toStage: d.stage }))
  );

  console.log('Creating a few activities/notes...');
  await Activity.bulkCreate([
    { type: 'call', content: 'Discussed budget range, sending proposal by Friday.', relatedType: 'deal', relatedId: deals[0].id },
    { type: 'note', content: 'Client prefers WhatsApp over email for quick updates.', relatedType: 'contact', relatedId: byCompany['BluePeak Retail'].id },
    { type: 'task', content: 'Follow up on AMC renewal terms.', relatedType: 'deal', relatedId: deals[1].id, dueAt: new Date(Date.now() + 3 * 24 * 3600 * 1000) },
  ]);

  console.log('\nDone! Demo login credentials:');
  console.log('  Manager/Admin -> email: manager@websmileindia.com  |  password: password123');
  console.log('  Sales Rep     -> email: rahul@websmileindia.com    |  password: password123');
  console.log(`\nCreated: ${contacts.length} contacts, ${leads.length} leads, ${deals.length} deals.`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});