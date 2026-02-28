import { Product } from '../products/ProductCard';

type Props = {
  product: Product;
};

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '';

export function WhatsAppOrderButton({ product }: Props) {
  const handleClick = () => {
    const digitsOnly = WHATSAPP_NUMBER.replace(/\D/g, '');
    if (!digitsOnly) {
      alert('WhatsApp number is not configured correctly.');
      return;
    }

    const message = encodeURIComponent(
      `Hello! I would like to order:\n\nProduct: ${product.name}\nPrice: ${new Intl.NumberFormat('en-RW',{style:'currency',currency:'RWF',maximumFractionDigits:0}).format(product.price)}\nCategory: ${product.category}\n\nPlease confirm availability.`
    );

    const url = `https://wa.me/${digitsOnly}?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <button
      type="button"
      className="w-full inline-flex items-center justify-center rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-accent/90"
      onClick={handleClick}
    >
      Order via WhatsApp
    </button>
  );
}

