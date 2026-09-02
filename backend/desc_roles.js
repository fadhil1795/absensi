const fs = require('fs');
const db = require('./src/db').default;
async function test() {
    const [res] = await db.query('DESCRIBE roles');
    fs.writeFileSync('roles_schema.json', JSON.stringify(res, null, 2));
    process.exit(0);
}
test();
