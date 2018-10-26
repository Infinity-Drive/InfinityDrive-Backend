/*
 * Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

const request = require('superagent');

/**
 * Generates a GET request the user endpoint.
 * @param {string} accessToken The access token to send with the request.
 * @param {Function} callback
 */
function getUserData(accessToken, callback) {
  request
    .get('https://graph.microsoft.com/v1.0/me')
    .set('Authorization', 'Bearer ' + accessToken)
    .end((err, res) => {
      callback(err, res);
    });
}

//get request to fetch drive info
function getDriveInfo(accessToken, callback) {
  request
    .get('https://graph.microsoft.com/v1.0/drive')
    .set('Authorization', 'Bearer ' + accessToken)
    .end((err, res) => {
      callback(err, res);
    });
}
//get request to fetch files
function getFiles(accessToken, callback) {
  request
    .get('https://graph.microsoft.com/v1.0/me/drive/root/children')
    .set('Authorization', 'Bearer ' + accessToken)
    .end((err, res) => {
      callback(err, res);
    });
}

function getProfilePhoto(accessToken, callback) {
  // Get the profile photo of the current user (from the user's mailbox on Exchange Online).
  // This operation in version 1.0 supports only work or school mailboxes, not personal mailboxes.
  request
   .get('https://graph.microsoft.com/beta/me/photo/$value')
   .set('Authorization', 'Bearer ' + accessToken)
   .end((err, res) => {
     // Returns 200 OK and the photo in the body. If no photo exists, returns 404 Not Found.
     callback(err, res.body);
   });
}

/**
 * Generates a PUT request to upload a file.
 * @param {string} accessToken The access token to send with the request.
 * @param {Function} callback
//  */
function uploadFile(accessToken, file, callback) {
  // This operation only supports files up to 4MB in size.
  // To upload larger files, see `https://developer.microsoft.com/graph/docs/api-reference/v1.0/api/item_createUploadSession`.
  request
   .put('https://graph.microsoft.com/beta/me/drive/root/children/mypic.jpg/content')
   .send(file)
   .set('Authorization', 'Bearer ' + accessToken)
   .set('Content-Type', 'image/jpg')
   .end((err, res) => {
     // Returns 200 OK and the file metadata in the body.
     callback(err, res.body);
   });
}

/**
 * Generates a POST request to create a sharing link (if one doesn't already exist).
 * @param {string} accessToken The access token to send with the request.
 * @param {string} id The ID of the file to get or create a sharing link for.
 * @param {Function} callback
//  */
// See https://developer.microsoft.com/en-us/graph/docs/api-reference/v1.0/api/item_createlink
function getSharingLink(accessToken, id, callback) {
  request
   .post('https://graph.microsoft.com/beta/me/drive/items/' + id + '/createLink')
   .send({ type: 'view' })
   .set('Authorization', 'Bearer ' + accessToken)
   .set('Content-Type', 'application/json')
   .end((err, res) => {
     // Returns 200 OK and the permission with the link in the body.
     callback(err, res.body.link);
   });
}


exports.getUserData = getUserData;
exports.getDriveInfo = getDriveInfo;  //this is added by me
exports.getFiles = getFiles;  //this is added by me
exports.getProfilePhoto = getProfilePhoto;
exports.uploadFile = uploadFile;
exports.getSharingLink = getSharingLink;