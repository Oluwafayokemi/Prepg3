// apps/investor/app/settings/page.jsx
"use client";

import { useEffect, useState } from "react";
import {
  getCurrentUser,
  updateUserAttributes,
  updatePassword,
} from "aws-amplify/auth";
import { generateClient } from "aws-amplify/api";
import styled, { ThemeProvider, createGlobalStyle } from "styled-components";
import {
  User,
  Lock,
  Bell,
  CreditCard,
  Globe,
  Save,
  Camera,
  Check,
  AlertCircle,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";

const client = generateClient();

// Theme definitions
const lightTheme = {
  background: "#ffffff",
  surface: "#f9fafb",
  text: "#111827",
  textSecondary: "#6b7280",
  border: "#e5e7eb",
  primary: "#3F8392",
  primaryDark: "#2d5f6d",
};

const darkTheme = {
  background: "#111827",
  surface: "#1f2937",
  text: "#f9fafb",
  textSecondary: "#9ca3af",
  border: "#374151",
  primary: "#3F8392",
  primaryDark: "#2d5f6d",
};

// Global styles that respond to theme
const GlobalStyles = createGlobalStyle`
  body {
    background: ${(props) => props.theme.background};
    color: ${(props) => props.theme.text};
    transition: background 0.3s ease, color 0.3s ease;
  }
`;

const PageContainer = styled.div`
  max-width: 1200px;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${(props) => props.theme.text};
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: ${(props) => props.theme.textSecondary};
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 2rem;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.div`
  background: ${(props) => props.theme.surface};
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  height: fit-content;
  position: sticky;
  top: 2rem;
`;

const TabButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background: ${(props) =>
    props.$active ? props.theme.primary : "transparent"};
  color: ${(props) => (props.$active ? "white" : props.theme.text)};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover {
    background: ${(props) =>
      props.$active ? props.theme.primary : props.theme.border};
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const ContentArea = styled.div`
  background: ${(props) => props.theme.surface};
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${(props) => props.theme.text};
  margin-bottom: 1.5rem;
`;

const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding-bottom: 2rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid ${(props) => props.theme.border};
`;

const AvatarContainer = styled.div`
  position: relative;
`;

const Avatar = styled.div`
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: ${(props) => props.theme.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
`;

const AvatarUpload = styled.button`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: white;
  border: 2px solid ${(props) => props.theme.border};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${(props) => props.theme.primary};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  svg {
    width: 16px;
    height: 16px;
    color: ${(props) => props.theme.primary};
  }
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const ProfileName = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${(props) => props.theme.text};
  margin-bottom: 0.25rem;
`;

const ProfileRole = styled.p`
  color: ${(props) => props.theme.textSecondary};
  margin-bottom: 0.75rem;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${(props) => props.theme.text};
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.primary};
    box-shadow: 0 0 0 3px rgba(63, 131, 146, 0.1);
  }

  &:disabled {
    background: ${(props) => props.theme.border};
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
  cursor: pointer;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.primary};
    box-shadow: 0 0 0 3px rgba(63, 131, 146, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid ${(props) => props.theme.border};
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${(props) => props.theme.primary};
  color: white;

  &:hover {
    background: ${(props) => props.theme.primaryDark};
    box-shadow: 0 4px 12px rgba(63, 131, 146, 0.3);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled(Button)`
  background: ${(props) => props.theme.border};
  color: ${(props) => props.theme.text};

  &:hover {
    background: ${(props) => props.theme.surface};
  }
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
`;

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: ${(props) => props.theme.primary};
  }

  &:checked + span:before {
    transform: translateX(24px);
  }
`;

const ToggleSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) => props.theme.border};
  transition: 0.3s;
  border-radius: 24px;

  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
`;

const NotificationItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid ${(props) => props.theme.border};

  &:last-child {
    border-bottom: none;
  }
`;

const NotificationInfo = styled.div``;

const NotificationTitle = styled.h4`
  font-weight: 600;
  color: ${(props) => props.theme.text};
  margin-bottom: 0.25rem;
`;

const NotificationDesc = styled.p`
  font-size: 0.875rem;
  color: ${(props) => props.theme.textSecondary};
`;

const AlertMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  background: ${(props) =>
    props.$type === "success"
      ? "#d1fae5"
      : props.$type === "error"
      ? "#fee2e2"
      : "#dbeafe"};
  color: ${(props) =>
    props.$type === "success"
      ? "#065f46"
      : props.$type === "error"
      ? "#991b1b"
      : "#1e40af"};

  svg {
    width: 20px;
    height: 20px;
  }
`;

const GET_INVESTOR = `
  query GetInvestor($id: ID!) {
    getInvestor(id: $id) {
      id
      email
      firstName
      lastName
      phone
      totalInvested
      portfolioValue
      totalROI
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_USER_PROFILE = `
  mutation UpdateInvestor(
    $id: ID!
    $firstName: String
    $lastName: String
    $phone: String
  ) {
    updateInvestor(
      input: {
        id: $id
        firstName: $firstName
        lastName: $lastName
        phone: $phone
      }
    ) {
      id
      name
      phone
    }
  }
`;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  // Profile form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    investorType: "individual",
    contactMethod: "email",
    timezone: "GMT",
  });

  // Security form data
  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Notification preferences - stored in localStorage
  const [notifications, setNotifications] = useState({
    propertyUpdates: true,
    messages: true,
    payments: true,
    milestones: true,
    marketing: false,
  });

  // User preferences - stored in localStorage
  const [preferences, setPreferences] = useState({
    language: "en",
    currency: "GBP",
    dateFormat: "DD/MM/YYYY",
    theme: "light",
  });

  // Current active theme
  const [currentTheme, setCurrentTheme] = useState(lightTheme);

  useEffect(() => {
    loadUserProfile();
    loadLocalSettings();
  }, []);

  // Load settings from localStorage
  const loadLocalSettings = () => {
    try {
      const savedNotifications = localStorage.getItem("notifications");
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }

      const savedPreferences = localStorage.getItem("preferences");
      if (savedPreferences) {
        const prefs = JSON.parse(savedPreferences);
        setPreferences(prefs);
        // Apply theme immediately
        applyTheme(prefs.theme);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  // Apply theme
  const applyTheme = (theme) => {
    if (theme === "dark") {
      setCurrentTheme(darkTheme);
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      setCurrentTheme(lightTheme);
      document.documentElement.classList.remove("dark");
    } else {
      // Auto theme based on system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setCurrentTheme(prefersDark ? darkTheme : lightTheme);
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      const userId = currentUser.userId || currentUser.username;

      const result = await client.graphql({
        query: GET_INVESTOR,
        variables: { id: userId },
      });

      const userData = result.data.getInvestor;
      setUser(userData);
      setFormData((prev) => ({
        ...prev,
        name: `${userData.firstName} ${userData.lastName}` || "",
        email: userData.email || "",
        phone: userData.phone || "",
      }));
    } catch (err) {
      console.error("Error loading profile:", err);
      showAlert("Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type = "success") => {
    setAlertMessage({ message, type });
    setTimeout(() => setAlertMessage(null), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecurityData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNotificationToggle = (key) => {
    const updated = {
      ...notifications,
      [key]: !notifications[key],
    };
    setNotifications(updated);
    localStorage.setItem("notifications", JSON.stringify(updated));
    showAlert("Notification preferences updated", "success");
  };

  const handlePreferenceChange = (e) => {
    const { name, value } = e.target;
    const updated = {
      ...preferences,
      [name]: value,
    };
    setPreferences(updated);

    // Apply theme immediately if theme is changed
    if (name === "theme") {
      applyTheme(value);
    }

    localStorage.setItem("preferences", JSON.stringify(updated));
    showAlert(
      `${name.charAt(0).toUpperCase() + name.slice(1)} updated to ${value}`,
      "success"
    );
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      await client.graphql({
        query: UPDATE_USER_PROFILE,
        variables: {
          id: user.id,
          name: formData.name,
          phone: formData.phone,
        },
      });

      // Also save local preferences
      const localPrefs = {
        investorType: formData.investorType,
        contactMethod: formData.contactMethod,
        timezone: formData.timezone,
      };
      localStorage.setItem("profilePreferences", JSON.stringify(localPrefs));

      showAlert("Profile updated successfully!", "success");
      await loadUserProfile(); // Reload to get fresh data
    } catch (err) {
      console.error("Error updating profile:", err);
      showAlert("Failed to update profile. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      if (securityData.newPassword !== securityData.confirmPassword) {
        showAlert("New passwords do not match", "error");
        return;
      }

      if (securityData.newPassword.length < 8) {
        showAlert("Password must be at least 8 characters", "error");
        return;
      }

      setSaving(true);

      await updatePassword({
        oldPassword: securityData.currentPassword,
        newPassword: securityData.newPassword,
      });

      showAlert("Password changed successfully!", "success");
      setSecurityData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error("Error changing password:", err);
      showAlert(err.message || "Failed to change password", "error");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <ThemeProvider theme={currentTheme}>
        <GlobalStyles />
        <DashboardLayout>
          <PageContainer>
            <p>Loading settings...</p>
          </PageContainer>
        </DashboardLayout>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={currentTheme}>
      <GlobalStyles />
      <DashboardLayout>
        <PageContainer>
          <PageHeader>
            <Title>Settings & Profile</Title>
            <Subtitle>Manage your account settings and preferences</Subtitle>
          </PageHeader>

          {alertMessage && (
            <AlertMessage $type={alertMessage.type}>
              {alertMessage.type === "success" ? <Check /> : <AlertCircle />}
              {alertMessage.message}
            </AlertMessage>
          )}

          <SettingsGrid>
            <Sidebar>
              <TabButton
                $active={activeTab === "profile"}
                onClick={() => setActiveTab("profile")}
              >
                <User />
                Profile Info
              </TabButton>
              <TabButton
                $active={activeTab === "security"}
                onClick={() => setActiveTab("security")}
              >
                <Lock />
                Security
              </TabButton>
              <TabButton
                $active={activeTab === "notifications"}
                onClick={() => setActiveTab("notifications")}
              >
                <Bell />
                Notifications
              </TabButton>
              <TabButton
                $active={activeTab === "billing"}
                onClick={() => setActiveTab("billing")}
              >
                <CreditCard />
                Billing
              </TabButton>
              <TabButton
                $active={activeTab === "preferences"}
                onClick={() => setActiveTab("preferences")}
              >
                <Globe />
                Preferences
              </TabButton>
            </Sidebar>

            <ContentArea>
              {activeTab === "profile" && (
                <>
                  <SectionTitle>Profile Information</SectionTitle>

                  <ProfileSection>
                    <AvatarContainer>
                      <Avatar>{getInitials()}</Avatar>
                      <AvatarUpload>
                        <Camera />
                      </AvatarUpload>
                    </AvatarContainer>
                    <ProfileInfo>
                      <ProfileName>{user?.name || "User"}</ProfileName>
                      <ProfileRole>Premium Investor</ProfileRole>
                      <Badge>Verified Account</Badge>
                    </ProfileInfo>
                  </ProfileSection>

                  <FormGrid>
                    <FormGroup>
                      <Label>First Name</Label>
                      <Input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="John Davidson"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Last Name</Label>
                      <Input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="John Davidson"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        disabled
                        placeholder="john@example.com"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Phone Number</Label>
                      <Input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+44 7700 900000"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Address</Label>
                      <Input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="123 Main St, City, Country"
                      />
                    </FormGroup>
                    
                    <FormGroup>
                      <Label>Date of Birth</Label>
                      <Input
                        type="text"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        placeholder="MM/DD/YYYY"
                      />
                    </FormGroup>
                    
                    <FormGroup>
                      <Label>Investor Type</Label>
                      <Select
                        name="investorType"
                        value={formData.investorType}
                        onChange={handleInputChange}
                      >
                        <option value="individual">Individual</option>
                        <option value="company">Company</option>
                        <option value="trust">Trust</option>
                      </Select>
                    </FormGroup>

                    <FormGroup>
                      <Label>Preferred Contact Method</Label>
                      <Select
                        name="contactMethod"
                        value={formData.contactMethod}
                        onChange={handleInputChange}
                      >
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="both">Both</option>
                      </Select>
                    </FormGroup>

                    <FormGroup>
                      <Label>Time Zone</Label>
                      <Select
                        name="timezone"
                        value={formData.timezone}
                        onChange={handleInputChange}
                      >
                        <option value="GMT">GMT (London)</option>
                        <option value="EST">EST (New York)</option>
                        <option value="PST">PST (Los Angeles)</option>
                        <option value="CET">CET (Paris)</option>
                        <option value="JST">JST (Tokyo)</option>
                      </Select>
                    </FormGroup>
                  </FormGrid>

                  <ButtonGroup>
                    <PrimaryButton
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      <Save />
                      {saving ? "Saving..." : "Save Changes"}
                    </PrimaryButton>
                    <SecondaryButton onClick={loadUserProfile}>
                      Cancel
                    </SecondaryButton>
                  </ButtonGroup>
                </>
              )}

              {activeTab === "security" && (
                <>
                  <SectionTitle>Security Settings</SectionTitle>

                  <FormGrid>
                    <FormGroup style={{ gridColumn: "1 / -1" }}>
                      <Label>Current Password</Label>
                      <Input
                        type="password"
                        name="currentPassword"
                        value={securityData.currentPassword}
                        onChange={handleSecurityChange}
                        placeholder="Enter current password"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>New Password</Label>
                      <Input
                        type="password"
                        name="newPassword"
                        value={securityData.newPassword}
                        onChange={handleSecurityChange}
                        placeholder="Enter new password"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Confirm New Password</Label>
                      <Input
                        type="password"
                        name="confirmPassword"
                        value={securityData.confirmPassword}
                        onChange={handleSecurityChange}
                        placeholder="Confirm new password"
                      />
                    </FormGroup>
                  </FormGrid>

                  <ButtonGroup>
                    <PrimaryButton
                      onClick={handleChangePassword}
                      disabled={saving}
                    >
                      <Lock />
                      {saving ? "Updating..." : "Update Password"}
                    </PrimaryButton>
                  </ButtonGroup>

                  <div
                    style={{
                      marginTop: "2rem",
                      padding: "1rem",
                      background: currentTheme.border,
                      borderRadius: "0.5rem",
                    }}
                  >
                    <h4 style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
                      Password Requirements:
                    </h4>
                    <ul
                      style={{
                        marginLeft: "1.5rem",
                        color: currentTheme.textSecondary,
                        fontSize: "0.875rem",
                      }}
                    >
                      <li>At least 8 characters long</li>
                      <li>Include uppercase and lowercase letters</li>
                      <li>Include at least one number</li>
                      <li>Include at least one special character</li>
                    </ul>
                  </div>
                </>
              )}

              {activeTab === "notifications" && (
                <>
                  <SectionTitle>Notification Preferences</SectionTitle>

                  <NotificationItem>
                    <NotificationInfo>
                      <NotificationTitle>Property Updates</NotificationTitle>
                      <NotificationDesc>
                        Receive updates about your property investments
                      </NotificationDesc>
                    </NotificationInfo>
                    <ToggleSwitch>
                      <ToggleInput
                        type="checkbox"
                        checked={notifications.propertyUpdates}
                        onChange={() =>
                          handleNotificationToggle("propertyUpdates")
                        }
                      />
                      <ToggleSlider />
                    </ToggleSwitch>
                  </NotificationItem>

                  <NotificationItem>
                    <NotificationInfo>
                      <NotificationTitle>Messages</NotificationTitle>
                      <NotificationDesc>
                        Get notified when you receive new messages
                      </NotificationDesc>
                    </NotificationInfo>
                    <ToggleSwitch>
                      <ToggleInput
                        type="checkbox"
                        checked={notifications.messages}
                        onChange={() => handleNotificationToggle("messages")}
                      />
                      <ToggleSlider />
                    </ToggleSwitch>
                  </NotificationItem>

                  <NotificationItem>
                    <NotificationInfo>
                      <NotificationTitle>
                        Payment Notifications
                      </NotificationTitle>
                      <NotificationDesc>
                        Alerts for payments and financial transactions
                      </NotificationDesc>
                    </NotificationInfo>
                    <ToggleSwitch>
                      <ToggleInput
                        type="checkbox"
                        checked={notifications.payments}
                        onChange={() => handleNotificationToggle("payments")}
                      />
                      <ToggleSlider />
                    </ToggleSwitch>
                  </NotificationItem>

                  <NotificationItem>
                    <NotificationInfo>
                      <NotificationTitle>
                        Milestone Achievements
                      </NotificationTitle>
                      <NotificationDesc>
                        Updates when properties reach important milestones
                      </NotificationDesc>
                    </NotificationInfo>
                    <ToggleSwitch>
                      <ToggleInput
                        type="checkbox"
                        checked={notifications.milestones}
                        onChange={() => handleNotificationToggle("milestones")}
                      />
                      <ToggleSlider />
                    </ToggleSwitch>
                  </NotificationItem>

                  <NotificationItem>
                    <NotificationInfo>
                      <NotificationTitle>
                        Marketing Communications
                      </NotificationTitle>
                      <NotificationDesc>
                        News about new opportunities and platform updates
                      </NotificationDesc>
                    </NotificationInfo>
                    <ToggleSwitch>
                      <ToggleInput
                        type="checkbox"
                        checked={notifications.marketing}
                        onChange={() => handleNotificationToggle("marketing")}
                      />
                      <ToggleSlider />
                    </ToggleSwitch>
                  </NotificationItem>
                </>
              )}

              {activeTab === "billing" && (
                <>
                  <SectionTitle>Billing & Payment Methods</SectionTitle>
                  <p
                    style={{
                      color: currentTheme.textSecondary,
                      marginBottom: "2rem",
                    }}
                  >
                    Manage your payment methods and view billing history
                  </p>

                  <SecondaryButton>Add Payment Method</SecondaryButton>

                  <div
                    style={{
                      marginTop: "2rem",
                      padding: "1rem",
                      background: currentTheme.border,
                      borderRadius: "0.5rem",
                    }}
                  >
                    <p
                      style={{
                        color: currentTheme.textSecondary,
                        fontSize: "0.875rem",
                      }}
                    >
                      Payment methods and billing features coming soon. You'll
                      be able to manage cards, view invoices, and set up
                      automatic payments.
                    </p>
                  </div>
                </>
              )}

              {activeTab === "preferences" && (
                <>
                  <SectionTitle>Preferences</SectionTitle>

                  <FormGrid>
                    <FormGroup>
                      <Label>Language</Label>
                      <Select
                        name="language"
                        value={preferences.language}
                        onChange={handlePreferenceChange}
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </Select>
                    </FormGroup>

                    <FormGroup>
                      <Label>Currency</Label>
                      <Select
                        name="currency"
                        value={preferences.currency}
                        onChange={handlePreferenceChange}
                      >
                        <option value="GBP">GBP (£)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </Select>
                    </FormGroup>

                    <FormGroup>
                      <Label>Date Format</Label>
                      <Select
                        name="dateFormat"
                        value={preferences.dateFormat}
                        onChange={handlePreferenceChange}
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </Select>
                    </FormGroup>

                    <FormGroup>
                      <Label>Theme</Label>
                      <Select
                        name="theme"
                        value={preferences.theme}
                        onChange={handlePreferenceChange}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto (System)</option>
                      </Select>
                    </FormGroup>
                  </FormGrid>

                  <div
                    style={{
                      marginTop: "2rem",
                      padding: "1rem",
                      background: currentTheme.border,
                      borderRadius: "0.5rem",
                    }}
                  >
                    <h4 style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
                      Current Settings:
                    </h4>
                    <ul
                      style={{
                        marginLeft: "1.5rem",
                        color: currentTheme.textSecondary,
                        fontSize: "0.875rem",
                      }}
                    >
                      <li>Language: {preferences.language.toUpperCase()}</li>
                      <li>Currency: {preferences.currency}</li>
                      <li>Date Format: {preferences.dateFormat}</li>
                      <li>
                        Theme:{" "}
                        {preferences.theme.charAt(0).toUpperCase() +
                          preferences.theme.slice(1)}
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </ContentArea>
          </SettingsGrid>
        </PageContainer>
      </DashboardLayout>
    </ThemeProvider>
  );
}
