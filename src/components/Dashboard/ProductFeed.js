import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, DollarSign, Tag, Link, Image, CheckCircle, XCircle, ImagePlus } from 'lucide-react';
import CurrencyList from 'currency-list';

import API from '../../config/api.config';

const CURRENCIES = Object.values(CurrencyList.getAll('en_US')).map(c => ({
  code: c.code,
  name: c.name,
  symbol: c.symbol
}));

export default function ProductFeed({ token }) {
  const [products, setProducts] = useState([]);
  const [feedType, setFeedType] = useState('manual');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showShopifyForm, setShowShopifyForm] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaAssets, setMediaAssets] = useState([]);

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    compare_at_price: '',
    currency: 'USD',
    availability: 'in_stock',
    product_url: '',
    category: '',
    image_url: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API}/api/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Handle both old and new response formats
      const data = response.data.data || response.data;
      setProducts(data?.products || data || []);
      setFeedType(data?.feedType || 'manual');
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleAddProduct = async () => {
    try {
      await axios.post(`${API}/api/products`, newProduct, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Product added!');
      setShowAddForm(false);
      setNewProduct({
        name: '',
        description: '',
        price: '',
        compare_at_price: '',
        currency: 'USD',
        availability: 'in_stock',
        product_url: '',
        category: '',
        image_url: ''
      });
      loadProducts();
    } catch (error) {
      console.error('Add product error:', error);
      alert('Failed to add product');
    }
  };

  const loadMediaAssets = async () => {
    try {
      const response = await axios.get(`${API}/api/media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const assets = response.data?.assets || response.data?.data?.mediaAssets || response.data || [];
      // Filter to only product-category images
      const productAssets = Array.isArray(assets) ? assets.filter(a => a.category === 'product') : [];
      setMediaAssets(productAssets);
    } catch (error) {
      console.error('Error loading media assets:', error);
      setMediaAssets([]);
    }
  };

  const handleMediaSelect = (asset) => {
    const imageUrl = asset.url && !asset.url.startsWith('http') ? `${API}${asset.url}` : asset.url;
    setNewProduct(prev => ({ ...prev, image_url: imageUrl, mediaId: asset._id || asset.id }));
    setShowMediaPicker(false);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product?')) return;

    try {
      await axios.delete(`${API}/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Product deleted!');
      loadProducts();
    } catch (error) {
      alert('Failed to delete product');
    }
  };

  return (
    <div className="section-card">
      <h2>🛍️ Product Feed</h2>
      
      {products.length > 0 && (
        <div className="product-toolbar">
          <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            ➕ Add Product
          </button>
          {/* Shopify integration - coming soon
          <button className="btn btn-secondary" onClick={() => setShowShopifyForm(!showShopifyForm)}>
            🛒 Connect Shopify
          </button>
          */}
        </div>
      )}

      {(showAddForm || products.length === 0) && (
        <div className="add-product-form">
          <h3>Add New Product</h3>
          <div className="form-group">
            <label>Product Name *</label>
            <input
              type="text"
              placeholder="e.g., Premium T-Shirt"
              value={newProduct.name}
              onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Product description..."
              value={newProduct.description}
              onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
              rows={3}
            />
          </div>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Price *</label>
              <input
                type="number"
                placeholder="29.99"
                value={newProduct.price}
                onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Compare at Price</label>
              <input
                type="number"
                placeholder="39.99"
                value={newProduct.compare_at_price}
                onChange={(e) => setNewProduct({...newProduct, compare_at_price: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select
                value={newProduct.currency}
                onChange={(e) => setNewProduct({...newProduct, currency: e.target.value})}
              >
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                placeholder="e.g., Clothing, Electronics"
                value={newProduct.category}
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Availability</label>
              <select
                value={newProduct.availability}
                onChange={(e) => setNewProduct({...newProduct, availability: e.target.value})}
              >
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="digital">Digital Product</option>
                <option value="service">Service</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Image</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={newProduct.image_url}
                onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value, mediaId: undefined})}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { loadMediaAssets(); setShowMediaPicker(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                <ImagePlus size={16} /> Media Library
              </button>
            </div>
            {newProduct.image_url && (
              <img
                src={newProduct.image_url}
                alt="Preview"
                style={{ marginTop: '8px', maxWidth: '120px', maxHeight: '80px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
          </div>

          {/* Media Library Picker Modal */}
          {showMediaPicker && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
              onClick={() => setShowMediaPicker(false)}
            >
              <div
                style={{
                  background: 'var(--background, #fff)', borderRadius: '12px', padding: '24px',
                  maxWidth: '600px', width: '90%', maxHeight: '70vh', overflowY: 'auto',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>Select from Media Library</h3>
                  <button
                    onClick={() => setShowMediaPicker(false)}
                    style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}
                  >
                    ×
                  </button>
                </div>
                {mediaAssets.length === 0 ? (
                  <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>
                    No product images found in your Media Library. Upload images with category "product" in the Media Library section first.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                    {mediaAssets.map((asset, idx) => {
                      const assetUrl = asset.url && !asset.url.startsWith('http') ? `${API}${asset.url}` : asset.url;
                      return (
                        <div
                          key={asset._id || asset.id || idx}
                          onClick={() => handleMediaSelect(asset)}
                          style={{
                            cursor: 'pointer', borderRadius: '8px', border: '2px solid transparent',
                            overflow: 'hidden', transition: 'border-color 0.2s',
                            background: '#f9fafb'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#000'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                        >
                          <img
                            src={assetUrl}
                            alt={asset.name || 'Product image'}
                            style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                          />
                          {asset.name && (
                            <p style={{ fontSize: '11px', padding: '4px 6px', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {asset.name}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="form-group">
            <label>Product URL</label>
            <input
              type="url"
              placeholder="https://yourstore.com/product"
              value={newProduct.product_url}
              onChange={(e) => setNewProduct({...newProduct, product_url: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={handleAddProduct}>
              ✅ Add Product
            </button>
            <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      {showShopifyForm && (
        <div className="shopify-form">
          <h3>Connect Shopify Store</h3>
          <p>🚧 Shopify integration coming soon! Use CSV upload or manual entry for now.</p>
          <button className="btn btn-secondary" onClick={() => setShowShopifyForm(false)}>
            Close
          </button>
        </div>
      )}

      <div className="products-grid">
        {products.length === 0 ? null : (
          products.map((product, index) => {
            const imageUrl = product.image_url || product.image;
            const productId = product._id || product.productId;
            const currencySymbol = CURRENCIES.find(c => c.code === product.currency)?.symbol || '$';
            
            return (
              <div key={productId || index} className="product-card">
                {imageUrl && <img src={imageUrl} alt={product.name} />}
                <div className="product-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4>{product.name}</h4>
                    {product.availability && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '500',
                        background: product.availability === 'in_stock' ? '#dcfce7'
                          : product.availability === 'digital' ? '#dbeafe'
                          : product.availability === 'service' ? '#fef3c7'
                          : '#fee2e2',
                        color: product.availability === 'in_stock' ? '#166534'
                          : product.availability === 'digital' ? '#1e40af'
                          : product.availability === 'service' ? '#92400e'
                          : '#991b1b'
                      }}>
                        {product.availability === 'in_stock' ? (
                          <><CheckCircle size={12} /> In Stock</>
                        ) : product.availability === 'digital' ? (
                          <><CheckCircle size={12} /> Digital</>
                        ) : product.availability === 'service' ? (
                          <><CheckCircle size={12} /> Service</>
                        ) : (
                          <><XCircle size={12} /> Out of Stock</>
                        )}
                      </span>
                    )}
                  </div>
                  {product.category && (
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                      <Tag size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {product.category}
                    </p>
                  )}
                  <div className="product-price" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#111' }}>
                      {currencySymbol}{product.price}
                    </span>
                    {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
                      <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '14px' }}>
                        {currencySymbol}{product.compare_at_price}
                      </span>
                    )}
                  </div>
                  <p className="product-description">{product.description?.substring(0, 100)}</p>
                  {product.product_url && (
                    <a 
                      href={product.product_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: '#000000', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}
                    >
                      <Link size={12} /> View Product
                    </a>
                  )}
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteProduct(productId)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

