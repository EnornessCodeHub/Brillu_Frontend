import React, { useState, useEffect } from 'react';
import axios from 'axios';

import API from '../../config/api.config';

export default function CRMIntegration({ token }) {
  const [crmData, setCrmData] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('none');
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [credentials, setCredentials] = useState({});

  useEffect(() => {
    loadCRMData();
  }, []);

  const loadCRMData = async () => {
    try {
      const response = await axios.get(`${API}/api/crm`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCrmData(response.data.data);
      setSelectedProvider(response.data.data?.provider || 'none');
    } catch (error) {
      console.error('Error loading CRM data:', error);
    }
  };

  const handleConnect = async () => {
    try {
      await axios.post(`${API}/api/crm/connect`, {
        provider: selectedProvider,
        credentials
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Connected to ${selectedProvider}!`);
      setShowConnectForm(false);
      loadCRMData();
    } catch (error) {
      alert('Failed to connect CRM');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect CRM?')) return;

    try {
      await axios.post(`${API}/api/crm/disconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('CRM disconnected!');
      loadCRMData();
    } catch (error) {
      alert('Failed to disconnect');
    }
  };

  const providers = [
    { id: 'hubspot', name: 'HubSpot', icon: '🟠' },
    { id: 'salesforce', name: 'Salesforce', icon: '🔵' },
    { id: 'pipedrive', name: 'Pipedrive', icon: '🟢' },
    { id: 'zoho', name: 'Zoho CRM', icon: '🔴' }
  ];

  return (
    <div className="section-card">
      <h2>🔗 CRM Integration</h2>
      
      {crmData?.isConnected ? (
        <div className="crm-connected">
          <div className="connection-status">
            <h3>✅ Connected to {crmData.provider}</h3>
            <p>Your CRM is successfully connected!</p>
            <button className="btn btn-danger" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>

          <div className="sync-settings">
            <h3>Sync Settings</h3>
            <label>
              <input type="checkbox" checked={crmData.syncSettings?.syncContacts} readOnly />
              Sync Contacts
            </label>
            <label>
              <input type="checkbox" checked={crmData.syncSettings?.syncCampaigns} readOnly />
              Sync Campaigns
            </label>
            <label>
              <input type="checkbox" checked={crmData.syncSettings?.autoSync} readOnly />
              Auto Sync
            </label>
          </div>
        </div>
      ) : (
        <div className="crm-providers">
          <p>Connect your CRM to sync contacts and track campaigns:</p>
          
          <div className="providers-grid">
            {providers.map(provider => (
              <div 
                key={provider.id}
                className={`provider-card ${selectedProvider === provider.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedProvider(provider.id);
                  setShowConnectForm(true);
                }}
              >
                <span className="provider-icon">{provider.icon}</span>
                <h4>{provider.name}</h4>
                <p>Connect</p>
              </div>
            ))}
          </div>

          {showConnectForm && selectedProvider !== 'none' && (
            <div className="connect-form">
              <h3>Connect {selectedProvider}</h3>
              
              {selectedProvider === 'hubspot' && (
                <>
                  <div className="form-group">
                    <input
                      type="text"
                      placeholder="API Key"
                      onChange={(e) => setCredentials({...credentials, apiKey: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      placeholder="Portal ID (optional)"
                      onChange={(e) => setCredentials({...credentials, portalId: e.target.value})}
                    />
                  </div>
                </>
              )}

              {selectedProvider === 'salesforce' && (
                <>
                  <div className="form-group">
                    <input
                      type="text"
                      placeholder="Instance URL"
                      onChange={(e) => setCredentials({...credentials, instanceUrl: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      placeholder="Access Token"
                      onChange={(e) => setCredentials({...credentials, accessToken: e.target.value})}
                    />
                  </div>
                </>
              )}

              {selectedProvider === 'pipedrive' && (
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="API Token"
                    onChange={(e) => setCredentials({...credentials, apiToken: e.target.value})}
                  />
                </div>
              )}

              {selectedProvider === 'zoho' && (
                <>
                  <div className="form-group">
                    <input
                      type="text"
                      placeholder="Client ID"
                      onChange={(e) => setCredentials({...credentials, clientId: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      placeholder="Client Secret"
                      onChange={(e) => setCredentials({...credentials, clientSecret: e.target.value})}
                    />
                  </div>
                </>
              )}

              <button className="btn btn-primary" onClick={handleConnect}>
                ✅ Connect
              </button>
              <button className="btn btn-secondary" onClick={() => setShowConnectForm(false)}>
                ❌ Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

