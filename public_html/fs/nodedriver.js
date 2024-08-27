/*
 * Instant Developer Cloud
 * Copyright Pro Gamma Spa 2000-2021
 * All rights reserved
 */


/* global ArrayBuffer, Buffer, module */

var Node = Node || {};
if (module)
  Node.FS = require("./fs");

/**
 * @class NodeDriver
 * Represents a node driver object,that will handle files and folders
 * @param {Object} parent
 * @param {Object} config
 */
Node.NodeDriver = function (parent, config)
{
  // Import modules
  Node.nodeFs = require("fs").promises;
  Node.File = require("./file");
  Node.Directory = require("./directory");
  //
  Node.FS.call(this, parent, config);
};

// Make Node.NodeDriver extend Node.FS
Node.NodeDriver.prototype = new Node.FS();


/**
 * Return absolute path
 * @param {File/Directory} obj
 */
Node.NodeDriver.prototype.getAbsolutePath = function (obj)
{
  // Absolute path
  let absPath = [this.path, obj.path].join("/");
  //
  // Remove final slash
  if (absPath.endsWith("/"))
    absPath = absPath.slice(0, -1);
  //
  return absPath;
};


/**
 * Creates the file physically (Opens the file and overwrites it)
 * @param {File} file
 */
Node.NodeDriver.prototype.createFile = async function (file)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  //
  // Check permissions
  if (this.permissions === Node.FS.permissions.read)
    throw new Error("Permission denied");
  //
  file.handle = await Node.nodeFs.open(file.absolutePath, "w+");
  this.files[file.id] = file;

};


/**
 * Opens the file for reading
 * @param {File} file
 */
Node.NodeDriver.prototype.openFile = async function (file)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  //
  file.handle = await Node.nodeFs.open(file.absolutePath, "r");
  this.files[file.id] = file;
};


/**
 * Opens the file to append data
 * @param {File} file
 */
Node.NodeDriver.prototype.openFileForAppend = async function (file)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  //
  // Check permissions
  if (this.permissions === Node.FS.permissions.read)
    throw new Error("Permission denied");
  //
  file.handle = await Node.nodeFs.open(file.absolutePath, "a");
  this.files[file.id] = file;
};


/**
 * Closes the file
 * @param {File} file
 */
Node.NodeDriver.prototype.close = async function (file)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  //
  delete this.files[file.id];
  await file.handle?.close();
  delete file.handle;
};


/**
 * Checks existence of a file
 * @param {File} file
 */
Node.NodeDriver.prototype.fileExists = async function (file)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  //
  try {
    return (await Node.nodeFs.stat(file.absolutePath)).isFile();
  }
  catch (e) {
    return e.code !== "ENOENT";
  }
};


/**
 * Reads a block of data, return an array buffer
 * @param {File} file
 * @param {Number} length
 * @param {Number} offset
 */
Node.NodeDriver.prototype.read = async function (file, length, offset)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  //
  // Check that the file is opened (reading)
  if (!file.handle)
    throw new Error("File not opened");
  //
  // Setting the correct limit: if length or offset are null take respectively the current position of the
  // reader and the position of the last byte of the file
  if (!length)
    length = await file.length();
  //
  let opts = {
    length,
    position: typeof offset === "number" ? offset : null,
    buffer: Buffer.alloc(length)
  };
  //
  let {bytesRead, buffer} = await file.handle.read(opts);
  //
  // Converts the Buffer to ArrayBuffer
  return (new Uint8Array(buffer.slice(0, bytesRead))).buffer;
};


/**
 * Read the whole file as text
 * @param {File} file
 */
Node.NodeDriver.prototype.readAll = async function (file)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  //
  // Client-size is done in file.readAll (must be different)
  // If not specified the default encoding is utf-8
  file.encoding = file.encoding || "utf-8";
  //
  // Read content
  return await Node.nodeFs.readFile(file.absolutePath, {encoding: file.encoding});
};


/**
 * Writes the data or the string given
 * @param {File} file
 * @param {String/Buffer} data
 * @param {Number} offset
 * @param {Number} length
 * @param {Number} position
 */
Node.NodeDriver.prototype.write = async function (file, data, offset, length, position)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  //
  // Check permissions
  if (this.permissions === Node.FS.permissions.read)
    throw new Error("Permission denied");
  //
  // Check that the file is opened (writing)
  if (!file.handle)
    throw new Error("File not open for write");
  //
  if (!data)
    throw new Error("No data to write");
  //
  if (!(data instanceof ArrayBuffer) && !(data instanceof Buffer) && typeof data !== "string")
    data = JSON.stringify(data);
  //
  // Checks if param data is an array buffer or a string
  if (typeof data === "string")
    await file.handle.write(data, position, file.encoding);
  else {
    if (!length)
      length = data.length;
    //
    if (!offset || offset < 0)
      offset = 0;
    //
    let buffer = Buffer.from(new Uint8Array(data));
    await file.handle.write(buffer, offset, length, position);
  }
};


/**
 * Copy the file
 * @param {File} file
 * @param {File} newFile
 */
Node.NodeDriver.prototype.copyFile = async function (file, newFile)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  if (!(newFile instanceof Node.File))
    throw new Error("The provided parameter 'newFile' must be an instance of Node.File");
  //
  // Check permissions
  if (this.permissions === Node.FS.permissions.read)
    throw new Error("Permission denied");
  //
  let exists = await file.exists();
  if (!exists)
    throw new Error("Error: file to copy doesn't exist");
  //
  await Node.nodeFs.copyFile(file.absolutePath, newFile.absolutePath);
};


/**
 * Rename a file or directory
 * @param {File/Directory} obj
 * @param {File/Directory} newObj
 */
Node.NodeDriver.prototype.renameObject = async function (obj, newObj)
{
  if (!(obj instanceof Node.File || obj instanceof Node.Directory))
    throw new Error("The provided parameter 'obj' must be an instance of Node.File or Node.Directory");
  //
  // Check permissions
  if (this.permissions === Node.FS.permissions.read)
    throw new Error("Permission denied");
  //
  // Back compatibility (newObj as name)
  if (typeof newObj === "string")
    newObj = this[obj instanceof Node.File ? "file" : "directory"](obj.path.substring(0, obj.path.lastIndexOf("/") + 1) + newObj);
  else if (!(newObj instanceof Node.File || newObj instanceof Node.Directory))
    throw new Error("The provided parameter 'newObj' must be an instance of Node.File or Node.Directory");
  //
  await Node.nodeFs.rename(obj.absolutePath, newObj.absolutePath);
};


/**
 * Return the file size (in bytes)
 * @param {File} file
 */
Node.NodeDriver.prototype.fileLength = async function (file)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  //
  return (await Node.nodeFs.stat(file.absolutePath)).size;
};


/**
 * Return the last modified file date
 * @param {File} file
 */
Node.NodeDriver.prototype.fileDateTime = async function (file)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  //
  return (await Node.nodeFs.stat(file.absolutePath)).mtime;
};


/**
 * Deletes a file
 * @param {File} file
 */
Node.NodeDriver.prototype.deleteFile = async function (file)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  //
  // Check permissions
  if (this.permissions === Node.FS.permissions.read)
    throw new Error("Permission denied");
  //
  await Node.nodeFs.rm(file.absolutePath);
};


/**
 * Zip a file
 * @param {File} file
 * @param {File} zipFile
 */
Node.NodeDriver.prototype.zipFile = async function (file, zipFile)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  if (!(zipFile instanceof Node.File))
    throw new Error("The provided parameter 'zipFile' must be an instance of Node.File");
  //
  // Check permissions
  if (this.permissions === Node.FS.permissions.read)
    throw new Error("Permission denied");
  //
  let filePath = file.absolutePath;
  let zipPath = zipFile.absolutePath;
  //
  await new Promise((resolve, reject) => {
    let error;
    let done = () => error ? reject(error) : resolve();
    //
    // Create the write stream
    let output = require("fs").createWriteStream(zipPath);
    //
    // Create the archive object
    let archive = require("archiver")("zip"); //license and detail: https://github.com/ctalkington/node-archiver
    //
    // Function that deletes the new zip file (if there is an error)
    let deleteVoidZip = err => {
      error = err;
      zipFile.remove().then();
      archive.finalize();
    };
    //
    // Listen to next error event
    output.once("error", deleteVoidZip);
    //
    // Listen to error event
    archive.on("error", deleteVoidZip);
    //
    output.on("open", () => {
      // Push data into the archive
      archive.pipe(output);
      //
      let input = require("fs").createReadStream(filePath);
      //
      // Listen to error event
      input.on("error", deleteVoidZip);
      //
      // Listen to error event
      input.on("open", () => {
        // Get the file name
        let sepPath = file.path.split("/");
        archive.append(input, {name: sepPath[sepPath.length - 1]}).finalize();
      });
      //
      // Listen to close finalization archive
      output.on('close', done);
    });
  });
};


/**
 * Unzip an archiver
 * @param {File} file
 * @param {Directory} directory
 */
Node.NodeDriver.prototype.unzip = async function (file, directory)
{
  if (!(file instanceof Node.File))
    throw new Error("The provided parameter 'file' must be an instance of Node.File");
  if (!(directory instanceof Node.Directory))
    throw new Error("The provided parameter 'directory' must be an instance of Node.Directory");
  //
  // Check permissions
  if (this.permissions === Node.FS.permissions.read)
    throw new Error("Permission denied");
  //
  // Check the validity of the path (writing)
  let zipPath = file.absolutePath;
  let dirPath = directory.absolutePath;
  //
  await new Promise((resolve, reject) => {
    // Opens the archive for decompression using the library yauzl
    // license and detail: https://github.com/thejoshwolfe/yauzl
    require("yauzl").open(zipPath, {lazyEntries: true}, (err, zipfile) => {
      if (err)
        return reject(err);
      //
      let ok = false;
      zipfile.readEntry();
      //
      // For each file/directory
      zipfile.on("entry", async entry => {
        try {
          await this.file(directory.path + "/" + entry.fileName, file.type).parentDirectory.create();
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err)
              return reject(err);
            //
            // Extract the files
            let output = require("fs").createWriteStream(dirPath + "/" + entry.fileName);
            //
            // Listen to open output event
            output.on("open", () => readStream.pipe(output));
            //
            // Listen to next error output event
            let rejected = false;
            output.once("error", error => {
              rejected = true;
              reject(error);
            });
            //
            // Listen to close output event
            output.on("close", () => !rejected && zipfile.readEntry());
          });
          resolve();
        }
        catch (e) {
          reject(e);
        }
      });
      //
      // When the parsing is in error
      zipfile.on("error", reject);
      //
      // When the parsing is to end
      zipfile.on("end", error => ok = true);
      //
      // When the parsing is over
      zipfile.on("close", () => {
        if (ok)
          resolve();
      });
    });
  });
};


/**
 * Create the directory
 * @param {Directory} directory
 */
Node.NodeDriver.prototype.mkDir = async function (directory)
{
  if (!(directory instanceof Node.Directory))
    throw new Error("The provided parameter 'directory' must be an instance of Node.Directory");
  //
  // Check permissions
  if (this.permissions === Node.FS.permissions.read)
    throw new Error("Permission denied");
  //
  await Node.nodeFs.mkdir(directory.absolutePath, {recursive: true});
};


/**
 * Checks the existence of the directory
 * @param {Directory} directory
 */
Node.NodeDriver.prototype.dirExists = async function (directory)
{
  if (!(directory instanceof Node.Directory))
    throw new Error("The provided parameter 'directory' must be an instance of Node.Directory");
  //
  try {
    return (await Node.nodeFs.stat(directory.absolutePath)).isDirectory();
  }
  catch (e) {
    return e.code !== "ENOENT";
  }
};


/**
 * Copies the entire directory
 * @param {Directory} srcDir
 * @param {Directory} dstDir
 */
Node.NodeDriver.prototype.copyDir = async function (srcDir, dstDir)
{
  if (!(srcDir instanceof Node.Directory))
    throw new Error("The provided parameter 'srcDir' must be an instance of Node.Directory");
  if (!(dstDir instanceof Node.Directory))
    throw new Error("The provided parameter 'dstDir' must be an instance of Node.Directory");
  //
  // Check permissions
  if (this.permissions === Node.FS.permissions.read)
    throw new Error("Permission denied");
  //
  // Check if source directory exists
  if (!await srcDir.exists())
    throw new Error(`Directory ${srcDir.path} doesn't exist`);
  //
  // Use fs extra to copy the entire directory
  //license and detail: https://www.npmjs.com/package/fs.extra
  await new Promise((resolve, reject) => {
    require("fs.extra").copyRecursive(srcDir.absolutePath, dstDir.absolutePath, error => error ? reject(error) : resolve());
  });
};


/**
 * Reads recursively the content of directory
 * @param {Directory} directory
 * @param {Number} depth
 */
Node.NodeDriver.prototype.readDirectory = async function (directory, depth)
{
  if (!(directory instanceof Node.Directory))
    throw new Error("The provided parameter 'directory' must be an instance of Node.Directory");
  //
  // Check the validity of the path (reading)
  let path = directory.absolutePath;
  //
  let result = [];
  let entries = await Node.nodeFs.readdir(path);
  for (let entry of entries) {
    let stat = await Node.nodeFs.stat(path + "/" + entry);
    let obj = this[stat.isFile() ? "file" : "directory"](directory.path + "/" + entry);
    result.push(this.serializeObject(obj));
    //
    if (obj instanceof Node.Directory && depth > 0)
      result.push(...await this.readDirectory(obj, depth - 1));
  }
  //
  return result;
};


/**
 * Zip directory
 * @param {Directory} directory
 * @param {File} zipFile
 */
Node.NodeDriver.prototype.zipDirectory = async function (directory, zipFile)
{
  if (!(directory instanceof Node.Directory))
    throw new Error("The provided parameter 'directory' must be an instance of Node.Directory");
  if (!(zipFile instanceof Node.File))
    throw new Error("The provided parameter 'zipFile' must be an instance of Node.File");
  //
  // Check permissions
  if (this.permissions === Node.FS.permissions.read)
    throw new Error("Permission denied");
  //
  let path = directory.absolutePath;
  let zipPath = zipFile.absolutePath;
  //
  // Check for existence of directory
  if (!await directory.exists())
    throw new Error("Directory doesn't exist");
  //
  // Create the archive object
  // license and detail: https://github.com/ctalkington/node-archiver
  let archive = require("archiver")("zip");
  //
  try {
    // Create the write stream
    let output = require("fs").createWriteStream(zipPath);
    //
    await new Promise((resolve, reject) => {
      // Listen to next error event
      output.once("error", reject);
      //
      // Listen to close finalization archive
      output.on("close", resolve);
      //
      // Listen to error event
      archive.on("error", reject);
      //
      output.on("open", () => {
        // Push data into the archive
        archive.pipe(output);
        //
        // Add to archive the folder to compress
        archive.glob("**/*", {cwd: path});
        //
        archive.finalize();
      });
    });
  }
  catch (e) {
    try {
      archive.finalize();
      await zipFile.removeAsync();
    }
    catch (e) {
    }
    throw e;
  }
};


/**
 * Removes the entire directory
 * @param {Directory} directory
 */
Node.NodeDriver.prototype.removeDirRecursive = async function (directory)
{
  if (!(directory instanceof Node.Directory))
    throw new Error("The provided parameter 'directory' must be an instance of Node.Directory");
  //
  // Check permissions
  if (this.permissions === Node.FS.permissions.read)
    throw new Error("Permission denied");
  //
  // Use fs extra to remove the directory and its content
  if (!await directory.exists())
    return;
  //
  await Node.nodeFs.rmdir(directory.absolutePath, {recursive: true});
};


/**
 * Makes an HTTP request to a web server
 * @param {Object} url
 * @param {String} method
 * @param {Object} options
 */
Node.NodeDriver.prototype.httpRequest = async function (url, method, options)
{
  options = Object.assign({
    responseType: "text",
    gzip: true,
    params: {},
    headers: {}
  }, options);
  //
  if (options.file && !(options.file instanceof Node.File))
    throw new Error("The provided parameter 'options.file' must be an instance of Node.File");
  //
  // I make the header keys lowercase
  let headers = {};
  for (let key in options.headers)
    headers[key.toLowerCase()] = options.headers[key];
  options.headers = headers;
  //
  let multiPart = false;
  let download = false;
  let upload = false;
  switch (method) {
    case "POST":
      multiPart = true;
      break;

    case "DOWNLOAD":
      download = true;
      method = options.method || "GET";
      break;

    case "UPLOAD":
      multiPart = true;
      upload = true;
      method = "POST";
      break;
  }
  //
  // If not specified, the post request type is multipart
  if (options.headers["content-type"])
    multiPart = false;
  //
  // Create internal request options object
  let uri = url.url;
  let opts = {
    uri,
    method,
    gzip: options.gzip, // Add an Accept-Encoding header to request compressed content encodings from the server, default true
    headers: options.headers,
    auth: options.authentication,
    timeout: options.timeOut
  };
  //
  try {
    return await new Promise((resolve, reject) => {
      try {
        // Custom body case
        if (options.body) {
          opts.body = options.body;
          //
          if (typeof options.bodyType === "string")
            opts.headers["content-type"] = options.bodyType;
          else if (!options.headers["content-type"])
            opts.headers["content-type"] = "application/octet-stream";
          //
          // Types allowed for the custom body are: string and ArrayBuffer, but you can pass an object to
          // get a JSON custom body
          if (typeof options.body === "object") {
            if (options.body instanceof ArrayBuffer)
              opts.body = Buffer.from(options.body);
            else {
              try {
                opts.body = JSON.stringify(options.body);
                opts.headers["content-type"] = "application/json";
              }
              catch (e) {
                return reject(new Error(`Cannot stringify custom body: ${e.message}`));
              }
            }
          }
          else if (typeof options.body !== "string")
            return reject(new Error("Custom body must be String, Object or ArrayBuffer"));
        }
        else if (multiPart) { // multipart
          // Create multipart request for upload
          opts.formData = options.params;
          //
          // Delete custom Content-Type
          delete opts.headers["content-type"];
          //
          // File section (only fot the upload)
          if (upload) {
            // Add the file
            opts.formData[options._nameField] = {
              value: require("fs").createReadStream(options._file.absolutePath),
              options: {
                filename: options._fileName,
                contentType: options._fileContentType
              }
            };
          }
        }
        else if (opts.headers["content-type"] === "application/x-www-form-urlencoded")
          opts.form = options.params;
        else if (Object.keys(options.params).length > 0) {
          opts.qs = options.params;
          opts.useQuerystring = true;
        }
        //
        // For download check file path
        let downloadError, writeStream;
        if (download) {
          // Create stream
          writeStream = require("fs").createWriteStream(options._file.absolutePath, {encoding: null});
          writeStream.once("error", error => downloadError = error);
        }
        //
        // Set response as buffer
        if (download || options.responseType === "arraybuffer")
          opts.encoding = null;
        //
        // Make request
        let res = {};
        let uploadprogressTimer;
        let req = require("request")(opts, (error, response, body) => {
          // Stop the progress events when the response is complete
          clearInterval(uploadprogressTimer);
          //
          if (error)
            return reject(error);
          //
          // Remove bom utf-8
          if (typeof body === "string" && body.charCodeAt(0) === 65279)
            body = body.substring(1);
          //
          res.body = (body instanceof Buffer ? body.buffer : body);
          resolve(res);
        });
        //
        // Listen to response event
        req.on("response", response => {
          // Listen to next abort event
          req.once("abort", () => reject(downloadError || new Error("request aborted")));
          //
          res.status = response.statusCode;
          res.headers = response.headers;
          //
          // Download
          if (download && response.statusCode === 200) {
            if (downloadError)
              req.abort();
            else
              req.pipe(writeStream);
          }
          //
          // Amount of byte downloaded
          let byteDownloaded = 0;
          //
          // Listen to data response event
          response.on('data', data => {
            let totalBytes = response.headers["content-length"];
            if (totalBytes)
              totalBytes = parseInt(totalBytes);
            //
            byteDownloaded += data.length;
            if (url.onDownloadProgress(byteDownloaded, totalBytes) === false) {
              // Stop response writing
              req.abort();
            }
          });
        });
        //
        // Last value of byte sent
        let lastByteSent = 0;
        //
        // Upload progress handler
        uploadprogressTimer = setInterval(() => {
          let byteTotal, byteSent;
          if (req.req) {
            if (upload)
              byteTotal = options._fileSize;
            else
              byteTotal = req.req.getHeader("Content-Length");
            byteSent = Math.min(req.req.connection?._bytesDispatched, byteTotal);
          }
          else
            clearInterval(uploadprogressTimer);
          //
          // If the information is not avaible, stop the event
          if (byteTotal === undefined)
            return clearInterval(uploadprogressTimer);
          //
          // If the values have not changed, they are not notified
          if (lastByteSent === byteSent)
            return;
          //
          // Check if the upload was interrupted
          let abort = (url.onUploadProgress(byteSent, byteTotal) === false);
          lastByteSent = byteSent;
          //
          // In these cases, stops the event
          if (req._ended || abort)
            clearInterval(uploadprogressTimer);
          //
          if (abort)
            req.abort();
        }, 250);
      }
      catch (e) {
        reject(e);
      }
    });
  }
  catch (e) {
    return {error: e};
  }
};


/*
 * Deserialize File/Directory/Url
 * @param {Object} obj
 */
Node.NodeDriver.prototype.deserializeObject = function (obj)
{
  if (obj.id && this.files[obj.id])
    return this.files[obj.id];
  //
  switch (obj._t) {
    case "file":
      return this.file(obj.path, obj.id);
    case "directory":
      return this.directory(obj.path);
    case "url":
      return this.url(obj.url);
  }
};


/*
 * Serialize File/Directory/Url
 * @param {Object} obj
 */
Node.NodeDriver.prototype.serializeObject = function (obj)
{
  if (obj instanceof Node.File)
    return {path: obj.path, type: "file"};
  else if (obj instanceof Node.Directory)
    return {path: obj.path, type: "directory"};
  else if (obj instanceof Node.Url)
    return {url: obj.url};
};


/**
 * Receive a message
 * @param {Object} msg
 */
Node.NodeDriver.prototype.onMessage = async function (msg)
{
  let argsArray = [];
  //
  for (let i = 0; i < msg.args.length; i++) {
    let arg = msg.args[i];
    //
    // Deserialize arguments of type File/Directory/Url
    if (arg && typeof arg === "object" && arg._t) {
      let obj = this.deserializeObject(arg);
      obj.server = msg.server;
      argsArray.push(obj);
    }
    else if (arg && arg instanceof Buffer) // Get ArrayBuffer from Buffer
      argsArray.push(new Uint8Array(arg).buffer);
    else
      argsArray.push(arg);
  }
  //
  // Call function
  return await this[msg.cmd].apply(this, argsArray);
};


// export module for node
module.exports = Node.NodeDriver;
