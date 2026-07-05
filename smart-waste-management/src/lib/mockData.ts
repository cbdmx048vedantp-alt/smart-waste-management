export function triggerPDFDownload(complaint: any) {
  const content = `=========================================
SMART WASTE MANAGEMENT REPORT
Sustainable Cities & Communities (SDG 11)
=========================================
Complaint ID: ${complaint.id}
Date Reported: ${new Date(complaint.createdAt).toLocaleString()}
Citizen Reporter: ${complaint.citizenName}
-----------------------------------------
1. SITUATION REPORT & LOCATION
-----------------------------------------
Address: ${complaint.address}
Coordinates: [Lat: ${complaint.lat}, Lng: ${complaint.lng}]
Description: "${complaint.description}"
Status: ${complaint.status.toUpperCase()}
-----------------------------------------
2. GEMINI AI INTELLECTUAL CLASSIFICATION
-----------------------------------------
Primary Waste Type: ${complaint.wasteType}
Verification Score: ${complaint.confidence}% Confidence
Severity Index: ${complaint.severity}/10
Cleanliness Status: ${complaint.cleanlinessRating}
Priority Tier: ${complaint.priority}
AI Action recommendation:
"${complaint.recommendation}"
Immediate Environmental Impact:
"${complaint.environmentalImpact}"
-----------------------------------------
3. MUNICIPAL DISPATCH DETAILS
-----------------------------------------
Assigned Team: ${complaint.assignedTo || "Unassigned"}
Last Update: ${new Date(complaint.updatedAt).toLocaleString()}
=========================================
      End of Smart City Civic Audit
=========================================
  `;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `SmartCity_WasteReport_${complaint.id}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
