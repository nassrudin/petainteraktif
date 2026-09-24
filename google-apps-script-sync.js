function doPost(e) {
  try {
    // Configure the target on the server. Never accept a folder ID from a browser request.
    var FOLDER_ID = "1Slmi-qS--PbmWZh7KzFoMVG3iE5QqD_Z";
    var data = JSON.parse(e.postData.contents);
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(data.studentId || '') ||
        !data.studentName || !data.studentClass || !data.stages ||
        !Array.from({ length: 8 }, function (_, i) { return i + 1; })
          .every(function (id) { return data.stages[id] && data.stages[id].completed && data.stages[id].answers; })) {
      throw new Error('Data refleksi tidak lengkap.');
    }
    var folder = DriveApp.getFolderById(FOLDER_ID);

    var safeId = data.studentId.replace(/[^a-zA-Z0-9_-]/g, '');
    var fileName = "Refleksi_" + safeId + ".json";
    
    var fileContent = JSON.stringify(data, null, 2);
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    var file;
    try {
      var existing = folder.getFilesByName(fileName);
      if (existing.hasNext()) {
        file = existing.next();
        file.setContent(fileContent);
      } else {
        file = folder.createFile(fileName, fileContent, MimeType.PLAIN_TEXT);
      }
    } finally {
      lock.releaseLock();
    }
    
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
