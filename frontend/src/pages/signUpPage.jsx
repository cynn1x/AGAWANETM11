import React, { useState } from 'react';
import LoginPage, {
  Email,
  Password,
  Submit,
  Logo,
  Title,
  Footer,
  Input
} from '@react-login-page/page4';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: ''
  });
  
  const [formKey, setFormKey] = useState(0); // for reset

  const handleRegister = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        alert('Account created!');
        setFormData({ email: '', username: '', password: '' }); // clear form
        setFormKey((prev) => prev + 1); // reset input state
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Registration failed.');
      console.error(err);
    }
  };

  const css = {
    '--login-bg': '#f3f2f2',
    '--login-color': '#333',
    '--login-logo': '#fff',
    '--login-inner-bg': '#fff',
    '--login-banner-bg': '#fbfbfb',
    '--login-input': '#333',
    '--login-input-icon': '#dddddd',
    '--login-input-bg': 'transparent',
    '--login-input-border': 'rgba(0, 0, 0, 0.13)',
    '--login-input-placeholder': '#999999',
    '--login-btn': '#fff',
    '--login-btn-bg': '#b08bf8',
    '--login-btn-bg-focus': '#b08bf8',
    '--login-btn-bg-hover': '#b08bf8',
    '--login-btn-bg-active': '#b08bf8'
  };

  return (
    <LoginPage key={formKey} style={{ height: 500, ...css }}>
      <Logo>📝</Logo>
      <Title>Create an Account Here!</Title>

      <Email
        index={0}
        label="Email:"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />

      <Input
        index={1}
        label="Username:"
        name="username"
        placeholder="Username"
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

      <Submit index={3} onClick={handleRegister}>
        Sign up
      </Submit>

      <Footer>
        Already have an account? <a href="/login">Log in</a>
      </Footer>
    </LoginPage>
  );
};

export default SignupPage;
