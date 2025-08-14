import React, { useState } from 'react';
import LoginPage, {
  Email,
  Input,
  Password,
  Submit,
  Logo,
  Title,
  Footer
} from '@react-login-page/page4';

const Signup = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: ''
  });
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;


  const [formKey, setFormKey] = useState(0);
  console.log(apiBaseUrl)
  const handleSignup = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Signup successful! Please log in.');
        window.location.href = '/login';
      } else {
        alert(`Signup failed: ${data.error}`);
      }
    } catch (err) {
      alert('Signup request failed.');
      console.error(err);
    }
  };

  const darkTheme = {
    '--login-bg': '#1a202c', 
    '--login-color': '#fff',
    '--login-inner-bg': '#2d3748',
    '--login-logo': '#fff',
    '--login-input': '#fff',
    '--login-input-bg': '#4a5568',
    '--login-input-border': '#718096',
    '--login-input-placeholder': '#a0aec0',
    '--login-btn': '#ffffff',
    '--login-btn-bg': '#3182ce',
    '--login-btn-bg-hover': '#2b6cb0',
    '--login-btn-bg-focus': '#2c5282',
    '--login-btn-bg-active': '#2a4365',
    '--login-footer': '#e2e8f0',
  };

  return (
    <div style={{ background: '#1a202c', minHeight: '100vh', paddingTop: '50px' }}>
      <LoginPage key={formKey} style={{ height: 550, ...darkTheme }}>
        <Logo>🎟️</Logo>
        <Title>Create Your Account</Title>

        <Email
          index={0}
          label="Email:"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <Input
          index={1}
          name="username"
          label="Username:"
          placeholder="Choose a username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        />

        <Password
          index={2}
          label="Password:"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />

        <Submit index={3} onClick={handleSignup}>Sign Up</Submit>

        <Footer>
          Already have an account? <a href="/login">Log in</a>
        </Footer>
      </LoginPage>
    </div>
  );
};

export default Signup;
