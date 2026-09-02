const fs = require('fs');
const db = require('./src/db').default;
async function test() {
    const [roles] = await db.query('SELECT * FROM roles');
    fs.writeFileSync('roles_data.json', JSON.stringify(roles, null, 2));
    process.exit(0);
}
test();
