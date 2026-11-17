import { useEffect, useState } from 'react';

import {
  Mail,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Power,
  PowerOff,
  Settings as SettingsIcon,
  ShieldCheck,
  Brain,
  X,
  ChevronRight,
  Clock3,
} from 'lucide-react';

import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Form.jsx';


const DEFAULT_RULES = [
  {
    id: 'rule-1',
    name: 'Client emails requiring a response',
    condition: 'Emails from clients asking a direct question.',
    classification: 'Client to Reply',
    enabled: true,
  },
  {
    id: 'rule-2',
    name: 'Meeting and scheduling emails',
    condition: 'Emails containing meeting requests or scheduling details.',
    classification: 'Meetings',
    enabled: true,
  },
  {
    id: 'rule-3',
    name: 'Informational newsletters',
    condition: 'Newsletters and informational updates without an action.',
    classification: 'No Reply Needed',
    enabled: true,
  },
];


const PROVIDERS = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: 'G',
  },
  {
    id: 'outlook',
    name: 'Outlook',
    icon: 'O',
  },
];


function readAccounts() {
  try {
    const accounts = JSON.parse(
      localStorage.getItem('connectedAccounts') || '[]'
    );

    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}


function readRules() {
  try {
    const rules = JSON.parse(
      localStorage.getItem('learnedRules') || 'null'
    );

    return Array.isArray(rules) ? rules : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}


export default function Settings() {
  const [activeTab, setActiveTab] = useState('accounts');

  const [accounts, setAccounts] = useState(readAccounts);
  const [rules, setRules] = useState(readRules);

  const [showRuleForm, setShowRuleForm] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    name: '',
    condition: '',
    classification: 'Client to Reply',
  });

  const [selectedProvider, setSelectedProvider] = useState('gmail');

  const [reconnectingId, setReconnectingId] = useState(null);

  const [notice, setNotice] = useState('');


  useEffect(() => {
    localStorage.setItem(
      'connectedAccounts',
      JSON.stringify(accounts)
    );
  }, [accounts]);


  useEffect(() => {
    localStorage.setItem(
      'learnedRules',
      JSON.stringify(rules)
    );
  }, [rules]);


  const showNotice = (message) => {
    setNotice(message);

    window.setTimeout(() => {
      setNotice('');
    }, 3000);
  };


  /* =====================================================
     ACCOUNT ACTIONS
  ===================================================== */

  const handleReconnect = (account) => {
    if (reconnectingId) return;

    setReconnectingId(account.id);

    window.setTimeout(() => {
      setAccounts((current) =>
        current.map((item) =>
          item.id === account.id
            ? {
                ...item,
                status: 'connected',
                syncStatus: 'synced',
              }
            : item
        )
      );

      setReconnectingId(null);

      showNotice('Account connection restored in demo mode.');
    }, 1400);
  };


  const handleDisconnect = (accountId) => {
    const confirmed = window.confirm(
      'Are you sure you want to disconnect this account?'
    );

    if (!confirmed) return;

    setAccounts((current) =>
      current.filter((item) => item.id !== accountId)
    );

    showNotice('Account removed from this demo workspace.');
  };


  const handleConnectNew = () => {
    const provider = PROVIDERS.find(
      (item) => item.id === selectedProvider
    );

    const existing = accounts.some(
      (item) => item.provider === selectedProvider
    );

    if (existing) {
      showNotice(`${provider.name} is already connected.`);
      return;
    }

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

    setAccounts((current) => [...current, account]);

    showNotice(`${provider.name} connected in demo mode.`);
  };


  /* =====================================================
     LEARNED RULE ACTIONS
  ===================================================== */

  const handleToggleRule = (ruleId) => {
    setRules((current) =>
      current.map((rule) =>
        rule.id === ruleId
          ? { ...rule, enabled: !rule.enabled }
          : rule
      )
    );
  };


  const handleDeleteRule = (ruleId) => {
    setRules((current) =>
      current.filter((rule) => rule.id !== ruleId)
    );

    showNotice('Learned rule deleted.');
  };


  const handleAddRule = (event) => {
    event.preventDefault();

    if (
      !ruleForm.name.trim() ||
      !ruleForm.condition.trim()
    ) {
      return;
    }

    const newRule = {
      id: `rule-${Date.now()}`,
      name: ruleForm.name.trim(),
      condition: ruleForm.condition.trim(),
      classification: ruleForm.classification,
      enabled: true,
    };

    setRules((current) => [newRule, ...current]);

    setRuleForm({
      name: '',
      condition: '',
      classification: 'Client to Reply',
    });

    setShowRuleForm(false);

    showNotice('New learned rule added.');
  };


  return (
    <div className="settings-page">

      {/* PAGE HEADER */}

      <div className="settings-page-header">

        <div>
          <span className="settings-eyebrow">
            WORKSPACE CONFIGURATION
          </span>

          <h1>Settings</h1>

          <p>
            Manage connected email accounts and AI learning rules.
          </p>
        </div>

        <div className="settings-header-icon">
          <SettingsIcon size={21} />
        </div>

      </div>


      {/* NOTIFICATION */}

      {notice && (
        <div className="settings-notice">
          <CheckCircle2 size={16} />
          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}


      {/* SETTINGS TABS */}

      <div className="settings-tabs">

        <button
          type="button"
          className={
            activeTab === 'accounts' ? 'active' : ''
          }
          onClick={() => setActiveTab('accounts')}
        >
          <Mail size={16} />
          Email Accounts
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          className={
            activeTab === 'rules' ? 'active' : ''
          }
          onClick={() => setActiveTab('rules')}
        >
          <Brain size={16} />
          Learned Rules
          <ChevronRight size={14} />
        </button>

      </div>


      {/* ACCOUNT SETTINGS */}

      {activeTab === 'accounts' && (
        <section className="settings-section">

          <div className="settings-section-heading">

            <div>
              <h2>Connected accounts</h2>

              <p>
                Manage the email accounts available in your workspace.
              </p>
            </div>

            <span className="settings-count">
              {accounts.length} connected
            </span>

          </div>


          {/* ACCOUNT LIST */}

          {accounts.length > 0 ? (

            <div className="settings-account-list">

              {accounts.map((account) => {

                const provider = PROVIDERS.find(
                  (item) => item.id === account.provider
                );

                const isReconnecting =
                  reconnectingId === account.id;

                return (
                  <div
                    className="settings-account-card"
                    key={account.id}
                  >

                    <div
                      className={`settings-provider-logo ${
                        account.provider
                      }`}
                    >
                      {provider?.icon || 'M'}
                    </div>


                    <div className="settings-account-info">

                      <strong>
                        {account.providerName ||
                          provider?.name ||
                          'Email account'}
                      </strong>

                      <span>{account.email}</span>

                      <div className="settings-account-status">

                        {account.status === 'connected' ? (
                          <>
                            <CheckCircle2 size={13} />
                            Connected
                          </>
                        ) : (
                          <>
                            <AlertCircle size={13} />
                            Connection issue
                          </>
                        )}

                      </div>

                    </div>


                    <div className="settings-account-actions">

                      <Button
                        variant="outline"
                        size="sm"
                        loading={isReconnecting}
                        leftIcon={
                          !isReconnecting && (
                            <RefreshCw size={14} />
                          )
                        }
                        onClick={() =>
                          handleReconnect(account)
                        }
                      >
                        Reconnect
                      </Button>

                      <button
                        type="button"
                        className="settings-icon-action danger"
                        title="Disconnect account"
                        aria-label="Disconnect account"
                        onClick={() =>
                          handleDisconnect(account.id)
                        }
                      >
                        <PowerOff size={16} />
                      </button>

                    </div>

                  </div>
                );
              })}

            </div>

          ) : (

            <div className="settings-empty-state">

              <div className="settings-empty-icon">
                <Mail size={23} />
              </div>

              <h3>No email accounts connected</h3>

              <p>
                Connect Gmail or Outlook to make accounts
                available in your workspace.
              </p>

            </div>

          )}


          {/* ADD ACCOUNT */}

          <div className="settings-add-account">

            <div className="settings-subsection-heading">
              <h3>Add an email account</h3>

              <p>
                Choose a provider to connect another account.
              </p>
            </div>


            <div className="settings-add-account-controls">

              <select
                value={selectedProvider}
                onChange={(event) =>
                  setSelectedProvider(event.target.value)
                }
                aria-label="Select email provider"
              >
                {PROVIDERS.map((provider) => (
                  <option
                    key={provider.id}
                    value={provider.id}
                  >
                    {provider.name}
                  </option>
                ))}
              </select>


              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus size={16} />}
                onClick={handleConnectNew}
              >
                Add account
              </Button>

            </div>

            <div className="settings-demo-note">
              <ShieldCheck size={15} />

              <span>
                Account actions currently use simulated demo connections.
              </span>
            </div>

          </div>

        </section>
      )}


      {/* LEARNED RULES */}

      {activeTab === 'rules' && (
        <section className="settings-section">

          <div className="settings-section-heading">

            <div>
              <h2>AI learned rules</h2>

              <p>
                Manage rules used to organize and classify conversations.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={16} />}
              onClick={() => setShowRuleForm((current) => !current)}
            >
              Add rule
            </Button>

          </div>


          {/* ADD RULE FORM */}

          {showRuleForm && (
            <form
              className="settings-rule-form"
              onSubmit={handleAddRule}
            >

              <div className="settings-rule-form-heading">

                <h3>Create a learned rule</h3>

                <button
                  type="button"
                  onClick={() => setShowRuleForm(false)}
                  aria-label="Close rule form"
                >
                  <X size={17} />
                </button>

              </div>


              <Input
                label="Rule name"
                placeholder="e.g. Important client requests"
                value={ruleForm.name}
                onChange={(event) =>
                  setRuleForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />


              <div className="settings-rule-field">
                <label htmlFor="rule-condition">
                  Condition
                </label>

                <textarea
                  id="rule-condition"
                  placeholder="Describe when this rule should apply..."
                  value={ruleForm.condition}
                  onChange={(event) =>
                    setRuleForm((current) => ({
                      ...current,
                      condition: event.target.value,
                    }))
                  }
                  rows={3}
                  required
                />
              </div>


              <div className="settings-rule-field">
                <label htmlFor="rule-classification">
                  Classification
                </label>

                <select
                  id="rule-classification"
                  value={ruleForm.classification}
                  onChange={(event) =>
                    setRuleForm((current) => ({
                      ...current,
                      classification: event.target.value,
                    }))
                  }
                >
                  <option>Client to Reply</option>
                  <option>Assistant to Reply</option>
                  <option>No Reply Needed</option>
                  <option>Needs Review</option>
                  <option>Important</option>
                  <option>Meetings</option>
                  <option>General</option>
                </select>
              </div>


              <div className="settings-rule-form-actions">

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRuleForm(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                >
                  Save rule
                </Button>

              </div>

            </form>
          )}


          {/* RULE LIST */}

          {rules.length > 0 ? (

            <div className="settings-rule-list">

              {rules.map((rule) => (

                <div
                  className={`settings-rule-card ${
                    !rule.enabled ? 'disabled' : ''
                  }`}
                  key={rule.id}
                >

                  <div className="settings-rule-main">

                    <div className="settings-rule-icon">
                      <Brain size={18} />
                    </div>

                    <div className="settings-rule-info">

                      <strong>{rule.name}</strong>

                      <p>{rule.condition}</p>

                      <span className="settings-rule-classification">
                        {rule.classification}
                      </span>

                    </div>

                  </div>


                  <div className="settings-rule-actions">

                    <button
                      type="button"
                      className={`settings-toggle ${
                        rule.enabled ? 'enabled' : ''
                      }`}
                      role="switch"
                      aria-checked={rule.enabled}
                      aria-label={`${
                        rule.enabled ? 'Disable' : 'Enable'
                      } ${rule.name}`}
                      onClick={() => handleToggleRule(rule.id)}
                    >
                      <span />
                    </button>

                    <button
                      type="button"
                      className="settings-icon-action danger"
                      title="Delete rule"
                      aria-label="Delete rule"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>

                </div>

              ))}

            </div>

          ) : (

            <div className="settings-empty-state">

              <div className="settings-empty-icon">
                <Brain size={23} />
              </div>

              <h3>No learned rules yet</h3>

              <p>
                Create rules to guide how conversations should be classified.
              </p>

            </div>

          )}


          <div className="settings-rules-note">
            <Clock3 size={15} />

            <span>
              These rules are stored locally for the current demo.
              Backend rule learning will be integrated separately.
            </span>
          </div>

        </section>
      )}

    </div>
  );
}