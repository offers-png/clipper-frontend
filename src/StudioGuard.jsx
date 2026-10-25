import React from 'react';
import ProtectedRoute from './ProtectedRoute.jsx';
import { BrowserRouter } from 'react-router-dom';
import StudioWorkspace from './StudioWorkspace.jsx';
// Reuse the original guard without editing its authentication/session behavior.
export default function StudioGuard(){return <BrowserRouter><ProtectedRoute><StudioWorkspace/></ProtectedRoute></BrowserRouter>}
