const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const handleAuthSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?console\.error\('Authentication sync failed:', err\);\n    \}\n  \};/;

const replacement = `const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowAuthModal(false);
    await loginWithGoogle();
  };

  const handleLogout = async () => {
    await logout();
  };`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Patched handleAuthSubmit successfully.');
} else {
  console.log('Regex did not match.');
}
