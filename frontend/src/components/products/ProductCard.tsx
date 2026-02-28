import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatRwf } from '../../utils/format';
import { useState, useEffect, useRef } from 'react';
import { ContactAndAddModal } from '../orders/ContactAndAddModal';

export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  imageUrls?: string[];
};

type Props = {
  product: Product;
};

export function ProductCard({ product }: Props) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const images = product.imageUrls && product.imageUrls.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [rotateDeg, setRotateDeg] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [showModal, setShowModal] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const handleConfirmAdd = () => {
    addToCart(product);
    navigate('/cart');
  };

  const thumbsRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const mouseEndX = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showModal) return undefined;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
      if (e.key === 'ArrowLeft') setCurrentIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setCurrentIndex((i) => (i + 1) % images.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showModal, images.length]);

  // autoplay when not hovered and modal closed
  useEffect(() => {
    if (images.length <= 1) return undefined;
    if (isHovered || showModal) return undefined;
    const t = setInterval(() => setCurrentIndex((i) => (i + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, [images.length, isHovered, showModal]);

  // keep thumbnail scrolled into view
  useEffect(() => {
    if (!thumbsRef.current) return;
    const el = thumbsRef.current.children[currentIndex] as HTMLElement | undefined;
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [currentIndex]);

  const onMouseMove = (e: any) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 12;
    const rotateX = (0.5 - y) * 8;
    setTilt({ x: rotateX, y: rotateY });
  };

  const onMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  // mouse drag helpers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMoveDrag = (e: React.MouseEvent) => {
    if (!isDragging) return;
    mouseEndX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (mouseStartX.current == null || mouseEndX.current == null) {
      mouseStartX.current = null; mouseEndX.current = null; setIsDragging(false); return;
    }
    const delta = mouseStartX.current - mouseEndX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) setCurrentIndex((i) => (i + 1) % images.length);
      else setCurrentIndex((i) => (i - 1 + images.length) % images.length);
    }
    mouseStartX.current = null; mouseEndX.current = null; setIsDragging(false);
  };

  // touch swipe helpers for modal
  const handleTouchEnd = () => {
    if (touchStartX.current == null || touchEndX.current == null) return;
    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) setCurrentIndex((i) => (i + 1) % images.length);
      else setCurrentIndex((i) => (i - 1 + images.length) % images.length);
    }
    touchStartX.current = null; touchEndX.current = null;
  };

  return (
    <article
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={onMouseLeave}
      className="group rounded-2xl bg-white shadow-lg border border-slate-100 overflow-hidden flex flex-col transform transition-all duration-300"
      style={{ transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(${isHovered ? -6 : 0}px)` }}
    >
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
        {images.length > 0 ? (
          <div
            className="h-full w-full flex items-center justify-center relative"
            onTouchStart={(e) => { touchStartX.current = e.touches?.[0]?.clientX ?? null; }}
            onTouchMove={(e) => { touchEndX.current = e.touches?.[0]?.clientX ?? null; }}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={(e) => { onMouseMove(e); handleMouseMoveDrag(e); }}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { onMouseLeave(); handleMouseUp(); }}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <img
              src={images[currentIndex]}
              alt={product.name}
              onClick={() => setShowModal(true)}
              style={{ transform: `rotate(${rotateDeg}deg)` }}
              className="h-full w-full object-cover transition-transform duration-500 ease-out"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/60 hover:bg-white/80 rounded-full p-2 shadow-md"
                  aria-label="Previous image"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/60 hover:bg-white/80 rounded-full p-2 shadow-md"
                  aria-label="Next image"
                >
                  ▶
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setRotateDeg((r) => r + 90)}
              className="absolute right-3 bottom-3 bg-white/90 text-slate-800 rounded-full p-2 text-xs shadow"
              title="Rotate"
            >⟳</button>

            {/* center thumbnail dots */}
            {images.length > 1 && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentIndex(i)}
                    className={`w-8 h-6 rounded overflow-hidden border ${i === currentIndex ? 'border-amber-400 scale-110' : 'border-transparent'} transition-all transform`}
                    aria-label={`Show image ${i + 1}`}
                  >
                    <img src={img} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {product.category}
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">Image coming soon</div>
        )}
      </div>

      {/* modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowModal(false)} />
          <div className="relative max-w-4xl w-full bg-white rounded-lg overflow-hidden shadow-2xl">
            <button type="button" onClick={() => setShowModal(false)} className="absolute right-3 top-3 bg-white/90 rounded-full p-2 shadow">✕</button>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setCurrentIndex((i) => (i - 1 + images.length) % images.length)} className="p-3">◀</button>
              <div
                className="flex-1 h-[70vh] flex items-center justify-center bg-black"
                onTouchStart={(e) => { touchStartX.current = e.touches?.[0]?.clientX ?? null; }}
                onTouchMove={(e) => { touchEndX.current = e.touches?.[0]?.clientX ?? null; }}
                onTouchEnd={handleTouchEnd}
              >
                <img src={images[currentIndex]} alt={product.name} className="max-h-full max-w-full object-contain transition-opacity duration-300" />
              </div>
              <button type="button" onClick={() => setCurrentIndex((i) => (i + 1) % images.length)} className="p-3">▶</button>
            </div>
            {images.length > 1 && (
              <div className="p-3 flex gap-2 overflow-auto" ref={thumbsRef}>
                {images.map((img, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <button key={i} type="button" onClick={() => setCurrentIndex(i)} className={`w-20 h-16 rounded overflow-hidden border ${i === currentIndex ? 'border-amber-400 scale-105' : 'border-transparent'} transition-transform`}> 
                    <img src={img} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 p-4 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">{product.name}</h3>
        {product.description && <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>}
        <p className="mt-1 text-base font-semibold text-accent">{formatRwf(product.price)}</p>

        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) return navigate('/login');
              // Open contact modal to require customer contact first
              setContactModalOpen(true);
            }}
            className="w-full inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 shadow-lg transition-transform"
          >
            Add to cart
          </button>
        </div>
      </div>
    </article>
    <ContactAndAddModal
      product={product}
      open={contactModalOpen}
      onClose={() => setContactModalOpen(false)}
      onConfirmAdd={handleConfirmAdd}
    />
  );
}

// render modal alongside component so it keeps access to addToCart
export default function ProductCardWrapper(props: any) {
  return <ProductCard {...props} />;
}
