function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    
    // ID Folder Google Drive target (ambil dari URL folder atau pasang di sini)
    // Contoh URL folder: https://drive.google.com/drive/folders/1Slmi-qS--PbmWZh7KzFoMVG3iE5QqD_Z
    var FOLDER_ID = "1Slmi-qS--PbmWZh7KzFoMVG3iE5QqD_Z";
    
    var folder;
    if (data.folderId && data.folderId.length > 10) {
      folder = DriveApp.getFolderById(data.folderId);
    } else {
      folder = DriveApp.getFolderById(FOLDER_ID);
    }

    var studentName = data.studentName || "Siswa";
    var studentClass = data.studentClass || "X";
    var absentNumber = data.studentAbsentNumber || "0";
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd_HH-mm");
    
    var fileName = "Refleksi_" + studentClass + "_Absen" + absentNumber + "_" + studentName.replace(/[^a-zA-Z0-9]/g, "_") + "_" + timestamp + ".json";
    
    var fileContent = JSON.stringify(data, null, 2);
    var file = folder.createFile(fileName, fileContent, MimeType.PLAIN_TEXT);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: fileName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
