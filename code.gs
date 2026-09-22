const SECRET_KEY = "80d99c20"; // CHANGE THIS
// const LOGO_URL = "https://avm.de/fileadmin/user_upload/DE/Presse/Downloads/AVM_Logo/AVM_Logo_CMYK.jpg";

function doGet(e) {

  if (!e || !e.parameter || e.parameter.key !== SECRET_KEY) {
    return ContentService.createTextOutput("Check status: Online. (Key Required)");
  }

  const serialToFind = e.parameter.serial;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Devices");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // 2. If no serial provided, show status message
  if (!serialToFind) {
    return ContentService.createTextOutput("System Online. Provide 'serial' to query data.");
  }

  // 3. Search for Serial
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === serialToFind.toString()) {
      // Map row back to a JSON object
      let result = {};
      headers.forEach((header, index) => {
        result[header.toLowerCase().replace(/ /g, "_")] = data[i][index];
      });
      
      return ContentService.createTextOutput(JSON.stringify(result, null, 2))
                           .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({error: "Serial not found"}))
                       .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!e || !e.parameter || e.parameter.key !== SECRET_KEY) return ContentService.createTextOutput("Error: Unauthorized");

  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Devices");
    
    const serial = data.serial || "NA";
    const hostname = data.hostname || "NA";
    const emailFromPost = data.email || ""; 
    const interfaceData = data.interface_ip || {};

    // 1. Get all current data to find the device
    const range = sheet.getDataRange();
    const values = range.getValues();
    let rowIndex = -1;
    let existingEmail = "";

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] && values[i][0].toString() === serial.toString()) {
        rowIndex = i + 1;
        existingEmail = values[i][14]; // Column O (index 14) is Email
        break;
      }
    }

    // 2. Logic to prevent "Self-Deletion": 
    // Use POST email if provided, otherwise keep the one already in the sheet
    let emailToSave = emailFromPost;
    if (!emailToSave || emailToSave === "NA" || emailToSave === "") {
        emailToSave = existingEmail || ""; 
    }

    // 3. Prepare the Row (Matching column positions)
    const otpKey = data["otp-key"] || data.otp_key || "NA";

    const newRow = [
      serial,                             // Col A (index 0)
      hostname,                           // Col B (index 1)
      data.model || "NA",                 // Col C (index 2)
      JSON.stringify(interfaceData),     // Col D (index 3)
      JSON.stringify(data.interfaces_mac || {}), // Col E (index 4)
      data.public_ip || "NA",             // Col F (index 5)
      data.kvm?.version || "NA",          // Col G (index 6)
      data.avm?.version || "NA",          // Col H (index 7)
      data.automation?.version || "NA",   // Col I (index 8)
      data.linux_os?.pretty_name || "NA", // Col J (index 9)
      data.linux_os?.kernel || "NA",      // Col K (index 10)
      data.linux_os?.architecture || "NA",// Col L (index 11)
      otpKey,                             // Col M (index 12)
      data.updated || new Date().toISOString(), // Col N (index 13)
      emailToSave                         // Col O (index 14)
    ];

    // 4. Update or Append
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
    } else {
      sheet.appendRow(newRow);
    }

    // 5. Send Email if we have an address
    if (emailToSave && emailToSave.toString().includes("@")) {
      sendIpUpdateEmail(emailToSave, hostname, serial, interfaceData, data.updated);
    }

    return ContentService.createTextOutput("Success: Processed");
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString());
  }
}

function sendIpUpdateEmail(recipient, hostname, serial, interface_ip, updated) {
  let ipListHtml = "";
  let obj = (typeof interface_ip === 'string') ? JSON.parse(interface_ip) : interface_ip;
  
  // Mapping logic
  const nameMap = {
    "eth0": "LAN",
    "end0": "LAN",
    "wlan0": "WLAN"
  };

  for (let key in obj) {
    // Skip Tailscale / VPN interfaces
    if (key.startsWith("tailscale") || key.startsWith("tun") || key.toLowerCase().includes("vpn")) continue;

    if (obj[key] && obj[key] !== "NA") {
      let friendlyName = nameMap[key] || key;
      ipListHtml += `<li><b style="color:#003399;">${friendlyName}:</b> ${obj[key]}</li>`;
    }
  }

  // Only send if there is actual IP info to show
  if (ipListHtml === "") return; 

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border: 1px solid #eaeaea; border-radius: 8px; padding: 25px; max-width: 500px; background-color: #ffffff; color: #333333; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
    
    <!-- Header / Logo Section -->
    <div style="margin-bottom: 20px; border-bottom: 1px solid #eaeaea; padding-bottom: 15px;">
        <a href="https://avm.onl" style="font-size: 24px; font-weight: bold; color: #7c3aed; text-decoration: none; display: inline-block;">
        AVM
        </a>
    </div>
    
    <!-- Main Content -->
    <h3 style="color: #111827; margin-top: 0; font-size: 18px;">
        Network Update: <span style="color: #7c3aed; font-weight: normal;">${hostname}</span>
    </h3>
    
    <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 15px;">
        The following network updates have been registered for your device:
    </p>
    
    <!-- IP List Container -->
    <div style="background-color: #f9fafb; border-radius: 6px; padding: 15px; margin-bottom: 25px; border: 1px solid #f3f4f6;">
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
        ${ipListHtml}
        </ul>
    </div>
    
    <!-- Call to Action -->
    <div style="margin-bottom: 30px;">
        <a href="https://avm.onl" style="background-color: #7c3aed; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 14px; font-weight: bold; display: inline-block;">
        Buy AVM
        </a>
    </div>
    
    <!-- Footer -->
    <div style="border-top: 1px solid #eaeaea; padding-top: 15px;">
        <p style="font-size: 11px; color: #9ca3af; margin: 0; line-height: 1.6;">
        <strong>Serial:</strong> ${serial} <br>
        <strong>Time:</strong> ${updated}
        </p>
    </div>
    
    </div>
  `;

  MailApp.sendEmail({
    to: recipient,
    subject: `AVM: Network configuration updated for ${hostname}`,
    htmlBody: htmlBody
  });
}
