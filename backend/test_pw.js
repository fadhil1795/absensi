
const bcrypt = require('bcrypt');
const hash = '$2a$12$CkLW9QnLXeby1uZAkcKqZO.EcuThKGLFtKAJK7Rv/CvP77B78Vz5rO'; // Note: I might have missed some Chars if output was truncated, but let's try.
const pw = 'admin'; // Testing if it's 'admin'
const pw2 = 'password';

(async () => {
    const res1 = await bcrypt.compare(pw, hash);
    const res2 = await bcrypt.compare(pw2, hash);
    console.log('Match with "admin":', res1);
    console.log('Match with "password":', res2);
})();
