import React, { useState } from 'react';
import LoginPage, {
  Email, Password, Submit, Logo, Title, Footer
} from '@react-login-page/page4';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [formKey, setFormKey] = useState(0);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  const handleLogin = async () => {
    try {
      const response = await fetch('${apiBaseUrl}/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        window.location.href = '/events';
      } else {
        alert(`Login failed: ${data.error}`);
      }
    } catch (err) {
      alert('Login request failed.');
      console.error(err);
    }
  };

  const darkTheme = {
    '--login-bg': '#1a202c',
    '--login-color': '#333',
    '--login-inner-bg': '#d9d9d9',
    '--login-logo': '#333',
    '--login-input': '#fff',
    '--login-input-bg': '#333',
    '--login-input-border': '#444444',
    '--login-input-placeholder': '#999999',
    '--login-btn': '#ffffff',
    '--login-btn-bg': '#5a67d8',
    '--login-btn-bg-hover': '#434190',
    '--login-btn-bg-focus': '#6b46c1',
    '--login-btn-bg-active': '#553c9a',
    '--login-footer': '#cccccc',
  };

  return (
    <div style={{ background: '#1a202c', minHeight: '100vh', paddingTop: '50px' }}>
    <LoginPage key={formKey} style={{ height: 500, ...darkTheme }}>
      <Logo>🔒</Logo>
      <Title>Login</Title>

      <Email
        index={0}
        name="username"
        label="Username:"
        placeholder="Username"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
      />

      <Password
        index={1}
        label="Password:"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
      />

      <Submit index={2} onClick={handleLogin}>Log in</Submit>

      <Footer>
        Not a member? <a href="/signup">Sign up</a>
      </Footer>

    </LoginPage>
    </div>
  );
};

export default Login;
