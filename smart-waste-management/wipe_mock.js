const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/let mockUsers: User\[\] = \[[\s\S]*?\];/m, 'let mockUsers: User[] = [];');
code = code.replace(/let mockComplaints: Complaint\[\] = \[[\s\S]*?\];/m, 'let mockComplaints: Complaint[] = [];');
code = code.replace(/let mockNotifications: Notification\[\] = \[[\s\S]*?\];/m, 'let mockNotifications: Notification[] = [];');
code = code.replace(/let mockCrews: Crew\[\] = \[[\s\S]*?\];/m, 'let mockCrews: Crew[] = [];');
fs.writeFileSync('server.ts', code);
