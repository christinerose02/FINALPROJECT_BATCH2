
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8JU2REBh5M9IMcsqa883WUsvYE5GRnrg",
  authDomain: "simple-code-ba1d2.firebaseapp.com",
  databaseURL: "https://simple-code-ba1d2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "simple-code-ba1d2",
  storageBucket: "simple-code-ba1d2.firebasestorage.app",
  messagingSenderId: "1044260240776",
  appId: "1:1044260240776:web:d3e6659669fd7e58310e3d",
  measurementId: "G-QYV8PWMLDT"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Nodemailer setup for OTP
const nodemailer = ('nodemailer');


let currentUserEmail = '';
let currentUserRole = '';
let userDatarole = '';

// Handle registration form submission
document.getElementById('registerForm')?.addEventListener('submit', function (e) {
  e.preventDefault();

  const name = document.getElementById('name')?.value || '';
  const email = document.getElementById('email')?.value || '';
  const username = document.getElementById('username')?.value || '';
  const password = document.getElementById('password')?.value || '';
  const confirmPassword = document.getElementById('confirmPassword')?.value || '';
  const role = document.getElementById('role')?.value || '';

  if (password && confirmPassword && password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }

  registerUser(email, password, username, role);
});

export function registerUser(email, password, username, role) {
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      return database.ref('users/' + user.uid).set({
        username: username,
        email: email,
        role: role
      });
    })
    .then(() => {
      alert('Registration successful!');
      window.location.href = 'login.html';
    })
    .catch((error) => {
      alert('Registration failed: ' + error.message);
    });
}

// Handle login form submission
document.getElementById('loginForm')?.addEventListener('submit', function (e) {
  e.preventDefault(); // Prevents the form from reloading the page
  const email = document.getElementById('email')?.value || '';
  const password = document.getElementById('password')?.value || '';
  loginUser(email, password);
});

let otpSent = false;  // Add this flag to track OTP sending

export function loginUser(email, password) {
  if (otpSent) return;  // Prevent OTP from being sent multiple times

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      return database.ref('users/' + user.uid).once('value');
    })
    .then((snapshot) => {
      const userData = snapshot.val();
      currentUserEmail = userData.email;
      currentUserRole = userData.role;
      console.log('User data:', userData);

      // Store role in localStorage
      localStorage.setItem('currentUserRole', currentUserRole);

      sendOTP(currentUserEmail);  // Send OTP after user data is retrieved
      otpSent = true;  // Mark OTP as sent

      // Redirect to otp.html to allow OTP input
      window.location.href = 'otp.html';
    })
    .catch((error) => {
      alert('Login failed: ' + error.message);
    });
}


const serverEndpoint = 'http://localhost:3000/send-otp';

function sendOTP(email) {
  console.log('sendOTP called');
  
  // Generate the OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store OTP in localStorage
  localStorage.setItem('currentOTP', otp);

  console.log(`OTP for ${email}: ${otp}`);

  // Send OTP to server using fetch
  fetch('http://localhost:3000/send-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email, otp: otp }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('OTP sent successfully');
      } else {
        console.error('Failed to send OTP:', data.error);
      }
    })
    .catch(error => {
      console.error('Error sending OTP:', error);
    });
}





export function verifyOTP(enteredOTP) {
  const storedOTP = localStorage.getItem('currentOTP');
  const otpMessage = document.getElementById('otpMessage');

  // Retrieve the role from localStorage
  const currentUserRole = localStorage.getItem('currentUserRole');

  // Check if entered OTP matches the stored OTP or the bypass code
  if (enteredOTP === storedOTP || enteredOTP === 'bypass') {
    console.log('OTP verified or bypass code used'); // Debugging log
    localStorage.removeItem('currentOTP'); // Clean up stored OTP

    // Use the role from localStorage to determine the redirect
    if (currentUserRole === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'user.html';
    }
  } else {
    otpMessage.textContent = 'The entered OTP is wrong. Please try again.';
    otpMessage.style.color = 'red';
  }
}



function checkAuth() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      database.ref('users/' + user.uid).once('value')
        .then((snapshot) => {
          const userData = snapshot.val();
          if (userData.role === 'admin') {
            window.location.href = 'admin.html';
          } else {
            window.location.href = 'user.html';
          }
        });
    }
  });
}

function displayUsers() {
  const usersTable = document.getElementById('usersTable').getElementsByTagName('tbody')[0];

  database.ref('users').once('value')
    .then((snapshot) => {
      const users = snapshot.val();
      usersTable.innerHTML = '';

      for (const userId in users) {
        const user = users[userId];
        const row = usersTable.insertRow();

        const usernameCell = row.insertCell(0);
        const emailCell = row.insertCell(1);
        const roleCell = row.insertCell(2);

        usernameCell.textContent = user.username || 'N/A';
        emailCell.textContent = user.email || 'N/A';
        roleCell.textContent = user.role || 'N/A';
      }
    })
    .catch((error) => {
      console.error('Failed to fetch users:', error);
    });
}

if (window.location.pathname.includes('admin.html')) {
  displayUsers();
}

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      return database.ref('users/' + user.uid).once('value');
    })
    .then((snapshot) => {
      if (!snapshot.exists()) {
        return database.ref('users/' + auth.currentUser.uid).set({
          username: auth.currentUser.displayName,
          role: 'user'
        });
      }
    })
    .then(() => {
      return database.ref('users/' + auth.currentUser.uid).once('value');
    })
    .then((snapshot) => {
      const userData = snapshot.val();
      if (userData.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'user.html';
      }
    })
    .catch((error) => {
      alert('Google Sign-In failed: ' + error.message);
    });
}

function logout() {
  auth.signOut()
    .then(() => {
      window.location.href = 'login.html';
    })
    .catch((error) => {
      console.error('Logout failed:', error);
    });
}

window.logout = logout;