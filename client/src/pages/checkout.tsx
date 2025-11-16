import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Initialize Stripe - referenced from blueprint:javascript_stripe
// Lazily initialize to avoid module-level crash
let stripePromise: Promise<Stripe | null> | null = null;
const getStripePromise = () => {
  if (!stripePromise && import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  }
  return stripePromise;
};

interface CheckoutFormProps {
  appointmentId: string;
  amount: number;
}

const CheckoutForm = ({ appointmentId, amount }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/appointments',
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Payment successful, update appointment status
        await apiRequest("POST", "/api/confirm-payment", { appointmentId });
        
        toast({
          title: "Payment Successful",
          description: "Your appointment has been confirmed!",
        });

        // Redirect to appointments page
        setLocation('/appointments');
      }
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "An error occurred processing your payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setLocation('/appointments')}
          className="flex-1"
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="flex-1"
          data-testid="button-pay"
        >
          {isProcessing ? "Processing..." : `Pay $${(amount / 100).toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check if Stripe is configured
    if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
      setError('Payment processing is not configured. Please contact support.');
      return;
    }

    // Get appointment details from URL query params
    const params = new URLSearchParams(window.location.search);
    const id = params.get('appointmentId');

    if (!id) {
      setError('Missing appointment details');
      return;
    }

    setAppointmentId(id);

    // Create PaymentIntent - backend will fetch amount from appointment record
    apiRequest("POST", "/api/create-payment-intent", { 
      appointmentId: id
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setClientSecret(data.clientSecret);
          setAmount(data.amount); // Amount from backend
        }
      })
      .catch((err) => {
        setError('Failed to initialize payment');
        console.error('Payment intent error:', err);
      });
  }, []);

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/appointments')} data-testid="button-back">
              Back to Appointments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </div>
    );
  }

  const stripe = getStripePromise();
  if (!stripe) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Error</CardTitle>
            <CardDescription>Payment processing is not configured</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/appointments')} data-testid="button-back">
              Back to Appointments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Complete Payment</CardTitle>
          <CardDescription>
            Secure payment powered by Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripe} options={{ clientSecret }}>
            <CheckoutForm appointmentId={appointmentId} amount={amount} />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}
