import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Inbox,
  Clock3,
} from 'lucide-react';

import { Button } from '../ui/Button.jsx';


const PROVIDERS = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Connect your Google email account.',
    icon: 'G',
    className: 'gmail',
  },
  {
    id: 'outlook',
    name: 'Outlook',
    description: 'Connect your Microsoft email account.',
    icon: 'O',
    className: 'outlook',
  },
];


export default function Connect() {
  const navigate = useNavigate();

  const [selectedProvider, setSelectedProvider] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [connectedAccount, setConnectedAccount] = useState(null);
  const [error, setError] = useState('');

  const isConnecting = connectionStatus === 'connecting';
  const isConnected = connectionStatus === 'connected';


  const handleConnect = () => {
    if (!selectedProvider || isConnecting) return;

    setError('');
    setConnectionStatus('connecting');

    const provider = PROVIDERS.find(
      (item) => item.id === selectedProvider
    );

    // Demo OAuth simulation.
    // Replace this with real OAuth integration later.

    window.setTimeout(() => {
      const account = {
        id: `${selectedProvider}-${Date.now()}`,
        provider: selectedProvider,
        providerName: provider.name,
        email:
          selectedProvider === 'gmail'
            ? 'demo@gmail.com'
            : 'demo@outlook.com',
        status: 'connected',
        syncStatus: 'synced',
      };

      setConnectedAccount(account);
      setConnectionStatus('connected');

      const existingAccounts = JSON.parse(
        localStorage.getItem('connectedAccounts') || '[]'
      );

      const updatedAccounts = [
        ...existingAccounts.filter(
          (item) => item.provider !== selectedProvider
        ),
        account,
      ];

      localStorage.setItem(
        'connectedAccounts',
        JSON.stringify(updatedAccounts)
      );
    }, 1600);
  };


  const handleContinue = () => {
    navigate('/', { replace: true });
  };


  const handleTryAgain = () => {
    setConnectionStatus('idle');
    setConnectedAccount(null);
    setError('');
  };


  return (
    <div className="connect-page">

      {/* HEADER */}

      <header className="connect-header">

        <div className="connect-brand">
          <div className="connect-brand-icon">
            <Mail size={20} />
          </div>

          <span>AssistFlow</span>
        </div>

        <div className="connect-step-indicator">
          <span className="connect-step completed">
            <CheckCircle2 size={14} />
            Account created
          </span>

          <span className="connect-step-divider" />

          <span className="connect-step active">
            <span className="connect-step-number">2</span>
            Connect email
          </span>
        </div>

      </header>


      {/* MAIN CONTENT */}

      <main className="connect-main">

        <div className="connect-content">

          {!isConnected ? (
            <>

              <div className="connect-heading">

                <span className="connect-eyebrow">
                  EMAIL ACCOUNT SETUP
                </span>

                <h1>
                  Connect your email account
                </h1>

                <p>
                  Choose the email provider you use. Your connected
                  account will be available in your assistant workspace.
                </p>

              </div>


              {/* PROVIDER OPTIONS */}

              <div className="connect-provider-list">

                {PROVIDERS.map((provider) => {
                  const selected =
                    selectedProvider === provider.id;

                  return (
                    <button
                      key={provider.id}
                      type="button"
                      className={`connect-provider-card ${
                        selected ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setSelectedProvider(provider.id);
                        setError('');
                      }}
                      disabled={isConnecting}
                    >

                      <div
                        className={`connect-provider-logo ${provider.className}`}
                      >
                        {provider.icon}
                      </div>

                      <div className="connect-provider-details">

                        <strong>{provider.name}</strong>

                        <span>{provider.description}</span>

                      </div>

                      <span
                        className={`connect-radio ${
                          selected ? 'checked' : ''
                        }`}
                      >
                        {selected && (
                          <span />
                        )}
                      </span>

                    </button>
                  );
                })}

              </div>


              {/* ERROR */}

              {error && (
                <div className="connect-error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}


              {/* CONNECT ACTION */}

              <Button
                variant="primary"
                size="lg"
                className="connect-action-button"
                disabled={!selectedProvider || isConnecting}
                loading={isConnecting}
                rightIcon={
                  !isConnecting && <ArrowRight size={17} />
                }
                onClick={handleConnect}
              >
                {isConnecting
                  ? 'Connecting account...'
                  : 'Connect account'}
              </Button>


              <div className="connect-security-note">
                <ShieldCheck size={16} />

                <span>
                  Your email connection is handled securely.
                </span>
              </div>


              {isConnecting && (
                <div className="connect-progress">
                  <RefreshCw size={15} className="connect-spin" />

                  <span>
                    Authorizing account and preparing sync...
                  </span>
                </div>
              )}

            </>
          ) : (

            /* CONNECTED STATE */

            <div className="connect-success">

              <div className="connect-success-icon">
                <CheckCircle2 size={30} />
              </div>

              <span className="connect-eyebrow">
                CONNECTION SUCCESSFUL
              </span>

              <h1>
                Your email is connected
              </h1>

              <p>
                Your account has been successfully connected
                to the workspace.
              </p>


              {/* ACCOUNT CARD */}

              <div className="connect-account-card">

                <div
                  className={`connect-provider-logo ${
                    connectedAccount.provider
                  }`}
                >
                  {connectedAccount.provider === 'gmail'
                    ? 'G'
                    : 'O'}
                </div>

                <div className="connect-account-details">

                  <strong>
                    {connectedAccount.providerName}
                  </strong>

                  <span>
                    {connectedAccount.email}
                  </span>

                </div>

                <span className="connect-status-badge">
                  <CheckCircle2 size={13} />
                  Connected
                </span>

              </div>


              {/* SYNC STATUS */}

              <div className="connect-sync-card">

                <div className="connect-sync-heading">
                  <div>
                    <RefreshCw size={16} />

                    <strong>Initial sync</strong>
                  </div>

                  <span className="connect-sync-complete">
                    Completed
                  </span>
                </div>

                <div className="connect-sync-progress">
                  <span />
                </div>

                <div className="connect-sync-footer">
                  <span>
                    <CheckCircle2 size={13} />
                    Account authorization complete
                  </span>

                  <span>
                    <Clock3 size={13} />
                    Demo sync completed
                  </span>
                </div>

              </div>


              <div className="connect-demo-notice">
                <Inbox size={16} />

                <span>
                  This is a simulated connection for the demo.
                  No actual emails have been imported.
                </span>
              </div>


              <Button
                variant="primary"
                size="lg"
                className="connect-action-button"
                rightIcon={<ArrowRight size={17} />}
                onClick={handleContinue}
              >
                Go to dashboard
              </Button>

            </div>

          )}

        </div>

      </main>


      {/* FOOTER */}

      <footer className="connect-footer">
        <span>
          AssistFlow · Personal Assistant Workspace
        </span>

        <span>
          Gmail and Outlook supported
        </span>
      </footer>

    </div>
  );
}