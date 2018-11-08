const format = require('util').format
const express = require('express')
var firebase = require('firebase')
const admin = require('firebase-admin')
const app = express()
var bodyParser = require('body-parser')
var multer = require('multer') // v1.0.5
var upload = multer() // for parsing multipart/form-data
const {Storage} = require('@google-cloud/storage')
const port = 3000

// 200 - OK
// 201 - Created  # Response to successful POST or PUT
// 302 - Found # Temporary redirect such as to /login
// 303 - See Other # Redirect back to page after successful login
// 304 - Not Modified
// 400 - Bad Request
// 401 - Unauthorized  # Not logged in
// 403 - Forbidden  # Accessing another user's resource
// 404 - Not Found
// 500 - Internal Server Error

// Initialize Firebase
// TODO: Replace with your project's customized code snippet
var config = {
  apiKey: 'AIzaSyADqL3LmcJ0hWhB8r1O0d9TjqiSruTHNz0',
  authDomain: 'pld-tuna-netra-test.firebaseapp.com',
  databaseURL: 'https://pld-tuna-netra-test.firebaseio.com',
  storageBucket: 'gs://pld-tuna-netra-test.appspot.com',
}

const storage = new Storage({
  projectId: 'pld-tuna-netra-test',
  keyFilename: './pld-tuna-netra-test-firebase-adminsdk-at3k5-810978d6ad.json'
})

var serviceAccount = require('./pld-tuna-netra-test-firebase-adminsdk-at3k5-810978d6ad.json')

admin.initializeApp({credential: admin.credential.cert(serviceAccount)})
firebase.initializeApp(config)

var db = admin.firestore()
const bucket = storage.bucket('gs://pld-tuna-netra-test.appspot.com')

app.use(bodyParser.json({limit: '4MB'})) // for parsing application/json
app.use(bodyParser.urlencoded({limit: '4MB', extended: true})) // for parsing application/x-www-form-urlencoded

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

app.get('/', (req, res) => res.send({msg: 'Hello PLD App!'}))

app.post('/createuser', (req, res) => {
  let email = req.body.email
  let password = req.body.password
  let hp = req.body.phone
  let name = req.body.name
  let imageUrl = req.body.image_url
  let role = req.body.role
  admin.auth().createUser({
    email: email,
    emailVerified: false,
    phoneNumber: hp,
    password: password,
    displayName: name,
    photoURL: imageUrl,
    disabled: false
  })
    .then((userRecord) => {
      // See the UserRecord reference doc for the contents of userRecord.
      var docRef = db.collection('user').doc(userRecord.uid)

      docRef.set({role: role})

      res.send({status: true, data: userRecord, message: 'user created'})
    })
    .catch((error) => {
      res.status(403)
      // Handle Errors here.
      var errorCode = error.code
      var errorMessage = error.message
      // ...
      res.send({status: false, data: {}, message: errorMessage})
    })
})

app.post('/login', (req, res) => {
  let email = req.body.email
  let password = req.body.password
  firebase.auth().signInWithEmailAndPassword(email, password)
  .then(() => {
    let uid = firebase.auth().currentUser.uid
    let role = db.collection('user').doc(uid).get()
    role.then((dat) => {
      res.send({status: true, data: {uid: uid, role: dat.data().role}, message: 'Login sucess'})
    })
  })
  .catch((error) => {
    res.status(401)
    // Handle Errors here.
    var errorCode = error.code
    var errorMessage = error.message
    // ...
    res.send({status: false, data: {}, message: errorMessage})
  })
})

app.get('/user/:uid', (req, res) => {
  admin.auth().getUser(req.params.uid)
  .then(function(userRecord) {
    // See the UserRecord reference doc for the contents of userRecord.
    res.send({status: true, data: userRecord, message: 'Data retrieve sucess'})
  })
  .catch(function(error) {
    console.log('Error fetching user data:', error);
  });
})

app.get('/request', (req, res) => {
  let audioRequest = db.collection('audio-request').get()
  audioRequest.then((snapshot) => {
    let data = []
    snapshot.forEach((doc) => {
      data.push({docid: doc.id,... doc.data()})
    })
    res.send({status: true, data: data, message: 'Login sucess'})
  })
})

app.get('/response', (req, res) => {
  let audioResponse = db.collection('audio-response').get()
  audioResponse.then((snapshot) => {
    let data = []
    snapshot.forEach((doc) => {
      data.push({docid: doc.id,... doc.data()})
    })
    res.send({status: true, data: data, message: 'Login sucess'})
  })
})

app.get('/request/:docid', (req, res) => {
  let docid = req.params.docid
  let audioRequest = db.collection('audio-request').doc(docid).get()
  audioRequest.then((snapshot) => {
    res.send({status: true, data: snapshot.data(), message: 'Login sucess'})
  })
})

app.get('/response/:docid', (req, res) => {
  let docid = req.params.docid
  let audioResponse = db.collection('audio-response').doc(docid).get()
  audioResponse.then((snapshot) => {
    res.send({status: true, data: snapshot.data(), message: 'Login sucess'})
  })
})

app.get('/request/dif/:uid', (req, res) => {
  let uid = req.params.uid
  let audioRequest = db.collection('audio-request').where('user_id', '==', uid).get()
  audioRequest.then((snapshot) => {
    let data = []
    snapshot.forEach((doc) => {
      data.push({docid: doc.id,... doc.data()})
    })
    res.send({status: true, data: data, message: 'Login sucess'})
  })
})

app.get('/response/dif/:uid', (req, res) => {
  let uid = req.params.uid
  let audioResponse = db.collection('audio-response').where('user_dif_id', '==', uid).get()
  audioResponse.then((snapshot) => {
    let data = []
    snapshot.forEach((doc) => {
      data.push({docid: doc.id,... doc.data()})
    })
    res.send({status: true, data: data, message: 'Login sucess'})
  })
})

app.post('/request/upload', upload.single('audio'), (req, res) => {
  let uid = req.body.user_id
  let img = req.body.user_image_url
  let name = req.body.name
  uploadAudioToRequestStorage(req.file)
   .then((response) => {
    var docRef = db.collection('audio-request').doc()

    var setAda = docRef.set({
      audio_url: response,
      user_id: uid,
      user_avatar_url: img,
      user_name: name
    })

    res.send(setAda)
   })
   .catch((e) => {
     console.log(e)
   })
})

app.post('/response/upload', upload.single('audio'), (req, res) => {
  let audioId = req.body.audio_id
  let category = req.body.category
  let uid = req.body.user_id
  let img = req.body.user_image_url
  let name = req.body.name
  let difuid = req.body.dif_user_id
  let difname = req.body.dif_name
  uploadAudioToResponseStorage(req.file)
   .then((response) => {
      var docRef = db.collection('audio-response').doc()

      var setAda = docRef.set({
        audio_url: response,
        category: category,
        user_id: uid,
        user_avatar_url: img,
        user_name: name,
        audio_request_id: audioId,
        user_dif_id: difuid,
        user_dif_name: difname
      })

      res.send(setAda)
   })
   .catch((e) => {
     console.log(e)
   })
})

app.post('/image/upload', upload.single('image'), (req, res) => {
  uploadImageToStorage(req.file)
    .then((response) => {
      res.send(response)
    })
    .catch((e) => {
      console.log(e)
    })
})

const uploadAudioToRequestStorage = (file) => {
  return new Promise((resolve, reject) => {

    if (!file) {
      reject('No file')
    }

    let newFileName = `${Date.now()}_${file.originalname}`

    let fileUpload = bucket.file(`/request/${newFileName}`)

    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype
      }
    })

    blobStream.on('error', (error) => {
      reject('Something is wrong! Unable to upload at the moment.')
    })

    blobStream.on('finish', () => {
      // The public URL can be used to directly access the file via HTTP.
      const url = format(`https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/request%2F${newFileName}`)
      resolve(url)
    })

    blobStream.end(file.buffer)
  })
}

const uploadAudioToResponseStorage = (file) => {
  return new Promise((resolve, reject) => {

    if (!file) {
      reject('No file')
    }

    let newFileName = `${Date.now()}_${file.originalname}`

    let fileUpload = bucket.file(`/response/${newFileName}`)

    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype
      }
    })

    blobStream.on('error', (error) => {
      reject('Something is wrong! Unable to upload at the moment.')
    })

    blobStream.on('finish', () => {
      // The public URL can be used to directly access the file via HTTP.
      const url = format(`https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/response%2F${newFileName}`)
      resolve(url)
    })

    blobStream.end(file.buffer)
  })
}

const uploadImageToStorage = (file) => {
  return new Promise((resolve, reject) => {

    if (!file) {
      reject('No file')
    }

    let newFileName = `${Date.now()}_${file.originalname}`

    let fileUpload = bucket.file(`/image/${newFileName}`)

    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype
      }
    })

    blobStream.on('error', (error) => {
      reject('Something is wrong! Unable to upload at the moment.')
    })

    blobStream.on('finish', () => {
      // The public URL can be used to directly access the file via HTTP.
      const url = format(`https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/image%2F${newFileName}`)
      resolve(url)
    })

    blobStream.end(file.buffer)
  })
}