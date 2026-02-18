import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Loader2, Package, Search, X } from 'lucide-react';
import API from '../../config/api.config';

export default function ProductPickerModal({
  isOpen,
  onClose,
  onConfirm,
  maxProducts = 2,
  preSelected = [],
  token
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set(preSelected));
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(new Set(preSelected));
    setSearchTerm('');
    setLoading(true);

    axios.get(`${API}/api/products?limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const data = res.data;
        setProducts(data?.products || data?.data?.products || data || []);
      })
      .catch(err => {
        console.error('Failed to load products:', err);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, token]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.category || '').toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const toggleProduct = (productId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else if (next.size < maxProducts) {
        next.add(productId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds));
    onClose();
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { USD: '$', EUR: '\u20AC', GBP: '\u00A3', CAD: 'C$', AUD: 'A$', INR: '\u20B9', PKR: 'Rs' };
    return symbols[currency] || currency || '$';
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="bg-background rounded-lg shadow-xl border"
        style={{ width: '680px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Select Products</h2>
            <p className="text-sm text-muted-foreground">
              Choose up to {maxProducts} product{maxProducts > 1 ? 's' : ''} for this block
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md text-sm"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length === 0 && products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No products in your feed</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add products in the Product Feed section first.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No products match "{searchTerm}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.has(product._id);
                const atLimit = selectedIds.size >= maxProducts && !isSelected;
                return (
                  <div
                    key={product._id}
                    onClick={() => !atLimit && toggleProduct(product._id)}
                    className={`border rounded-lg p-3 transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : atLimit
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:border-gray-400 cursor-pointer'
                    }`}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                    ) : (
                      <div className="w-full h-24 bg-muted rounded mb-2 flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCurrencySymbol(product.currency)}{product.price}
                    </p>
                    {product.category && (
                      <span className="inline-block mt-1 text-xs bg-muted px-2 py-0.5 rounded">
                        {product.category}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size} / {maxProducts} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Confirm Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
