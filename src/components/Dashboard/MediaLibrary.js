import React, { useState, useEffect } from 'react';
import axios from 'axios';

import API from '../../config/api.config';

export default function MediaLibrary({ token }) {
  const [assets, setAssets] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploadCategory, setUploadCategory] = useState('general'); // Category for new uploads
  const [selectedImage, setSelectedImage] = useState(null); // For full image view modal
  const [failedImages, setFailedImages] = useState(new Set()); // Track failed image IDs

  useEffect(() => {
    if (token) {
      loadAssets();
    }
  }, [token]);

  const loadAssets = async () => {
    if (!token) {
      console.warn('MediaLibrary: No token available, skipping load');
      return;
    }

    try {
      const response = await axios.get(`${API}/api/media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Convert relative URLs to full URLs
      const assets = (response.data.assets || []).map(asset => ({
        ...asset,
        url: asset.url?.startsWith('http') ? asset.url : `${API}${asset.url}`
      }));
      setAssets(assets);
      setFailedImages(new Set()); // Reset failed images when loading new assets
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', uploadCategory); // Use uploadCategory state

    try {
      const response = await axios.post(`${API}/api/media/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Upload response:', response.data);
      alert('Asset uploaded successfully!');
      loadAssets();
      e.target.value = ''; // Reset file input
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to upload asset';
      alert(`Upload failed: ${errorMsg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (assetId) => {
    if (!window.confirm('Delete this asset?')) return;

    try {
      await axios.delete(`${API}/api/media/${assetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Asset deleted!');
      loadAssets();
    } catch (error) {
      alert('Failed to delete asset');
    }
  };

  const filteredAssets = selectedCategory === 'all'
    ? assets
    : assets.filter(a => a.category === selectedCategory);

  return (
    <div className="section-card">
      <h2>📸 Media Library</h2>
      
      <div className="media-toolbar" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        {/* Upload Section */}
        <div className="upload-section" style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>
              Upload Category
            </label>
            <select 
              value={uploadCategory} 
              onChange={(e) => setUploadCategory(e.target.value)}
              disabled={uploading}
              style={{ 
                padding: '10px 15px', 
                borderRadius: '6px', 
                border: '2px solid #e0e0e0',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: '#fff',
                cursor: uploading ? 'not-allowed' : 'pointer',
                minWidth: '150px'
              }}
            >
              <option value="general">General</option>
              <option value="product">Products</option>
              <option value="logo">Logos</option>
              <option value="banner">Banners</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '23px' }}>
            <label className="btn btn-primary" style={{ margin: 0, cursor: uploading ? 'not-allowed' : 'pointer' }}>
              {uploading ? '⏳ Uploading...' : '📤 Upload Asset'}
              <input
                type="file"
                accept="image/*,video/*,.pdf"
                onChange={handleUpload}
                disabled={uploading}
                style={{display: 'none'}}
              />
            </label>
          </div>
        </div>

        {/* Filter Section */}
        <div className="filter-section" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>
              Filter View
            </label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ 
                padding: '10px 15px', 
                borderRadius: '6px', 
                border: '2px solid #e0e0e0',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: '#fff',
                cursor: 'pointer',
                minWidth: '150px'
              }}
            >
              <option value="all">All Assets</option>
              <option value="logo">Logos</option>
              <option value="banner">Banners</option>
              <option value="product">Products</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
      </div>

      <div className="assets-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '20px'
      }}>
        {filteredAssets.length === 0 ? (
          <p className="no-assets" style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '40px',
            color: '#666',
            fontSize: '16px'
          }}>No assets yet. Upload your first asset!</p>
        ) : (
          filteredAssets.map((asset, index) => {
            const assetId = asset._id || asset.id || `asset-${index}`;
            const imageFailed = failedImages.has(assetId);
            
            return (
            <div key={assetId} className="asset-card" style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: asset.type === 'image' ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}>
              {asset.type === 'image' ? (
                <div 
                  style={{
                    width: '100%',
                    height: '200px',
                    overflow: 'hidden',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedImage(asset)}
                >
                  {imageFailed ? (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#999',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      🖼️ Image failed to load
                    </div>
                  ) : (
                    <img 
                      src={asset.url} 
                      alt={asset.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        display: imageFailed ? 'none' : 'block'
                      }}
                      onError={() => {
                        setFailedImages(prev => new Set([...prev, assetId]));
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="file-preview" style={{
                  width: '100%',
                  height: '200px',
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  color: '#999'
                }}>
                  📄
                </div>
              )}
              <div className="asset-info" style={{
                padding: '15px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flex: 1
              }}>
                <p className="asset-name" style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#333',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }} title={asset.name}>{asset.name}</p>
                <p className="asset-category" style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#666',
                  textTransform: 'capitalize',
                  padding: '4px 8px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '4px',
                  display: 'inline-block',
                  width: 'fit-content'
                }}>{asset.category}</p>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(asset._id)}
                  style={{
                    marginTop: 'auto',
                    padding: '8px 16px',
                    fontSize: '12px',
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Full Image View Modal */}
      {selectedImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            cursor: 'pointer'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div 
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '15px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'absolute',
                top: '-50px',
                right: '0',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            >
              ✕
            </button>

            {/* Full Size Image */}
            <img 
              src={selectedImage.url} 
              alt={selectedImage.name}
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
              }}
            />

            {/* Image Info */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '15px 20px',
              borderRadius: '8px',
              color: '#fff',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600' }}>
                {selectedImage.name}
              </p>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.8, textTransform: 'capitalize' }}>
                Category: {selectedImage.category}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

