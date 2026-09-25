import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig, firebaseEnabled, teacherEmail } from './firebase-config';

// Firebase web configuration identifies the project; Firestore rules protect the data.

// Separate Auth instances preserve a student's anonymous session during teacher login.
const studentApp = firebaseEnabled ? initializeApp(firebaseConfig, 'student') : null;
const teacherApp = firebaseEnabled ? initializeApp(firebaseConfig, 'teacher') : null;
const provisioningApp = firebaseEnabled ? initializeApp(firebaseConfig, 'provisioning') : null;

export const studentAuth = studentApp ? getAuth(studentApp) : null;
export const teacherAuth = teacherApp ? getAuth(teacherApp) : null;
export const provisioningAuth = provisioningApp ? getAuth(provisioningApp) : null;
export const studentDb = studentApp ? getFirestore(studentApp) : null;
export const teacherDb = teacherApp ? getFirestore(teacherApp) : null;
