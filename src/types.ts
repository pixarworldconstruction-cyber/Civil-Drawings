export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  companyName?: string;
  address?: string;
  mobileNumber?: string;
  gstNumber?: string;
  logoUrl?: string;
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  walletBalance?: number;
  isWelcomeBonusClaimed?: boolean;
}

export type ProjectStatus = 
  | 'Project payment not processed'
  | 'Payment received'
  | 'All Details verified'
  | 'Data (photo/details) missing'
  | 'Project drawing in process'
  | '1st preview sent'
  | '2nd preview sent'
  | 'Working on revision'
  | 'Project completed';

export type ProjectType = 'Construction Project Drawing' | 'Interior design Project Drawing';
export type ConstructionSubType = 'Resident' | 'Commercial' | 'Resi-Com' | 'Other';
export type InteriorSubType = 'Resident' | 'Office Design' | 'Restaurant / Café Design' | 'Other';
export type HousingType = 'Row House' | 'Duplex' | 'Bungalow' | 'Villa' | 'Apartment';
export type NorthDirection = 'Up' | 'Down' | 'Left' | 'Right';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  projectType: ProjectType;
  subType: ConstructionSubType | InteriorSubType;
  status: ProjectStatus;
  // Resident specific
  bedrooms?: number;
  hall?: number;
  kitchen?: number;
  housingType?: HousingType;
  // Common for all
  totalBuiltUpArea: number;
  totalCarpetArea: number;
  numberOfFloors: number;
  landscapingArea?: number;
  compoundArea?: number;
  northDirection: NorthDirection;
  cost: number;
  gst: number;
  totalCost: number;
  createdAt: any; // Firestore Timestamp
}

export interface ProjectImage {
  id: string;
  projectId: string;
  url: string;
  caption?: string;
  createdAt: any; // Firestore Timestamp
}

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  url: string; // Data URI (base64)
  type: string; // MIME type
  createdAt: any; // Firestore Timestamp
}

export interface PricingPlan {
  id?: string;
  name: string;
  price: string;
  originalPrice?: string;
  period: string;
  features: string[];
  buttonText: string;
  isPopular?: boolean;
  samplePdfUrl?: string;
  discountLabel?: string;
  offerExpiry?: string; // ISO date string or human readable
}

export interface Bill {
  id: string;
  userId: string;
  projectId: string;
  projectName: string;
  amount: number;
  gst: number;
  total: number;
  discount?: number;
  createdAt: any; // Firestore Timestamp
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  price?: string;
}

export interface AdminProfile {
  companyName: string;
  address: string;
  mobileNumber: string;
  gstNumber: string;
  logoUrl: string;
}

export interface PageContent {
  id: string;
  heroTitle: string;
  heroSubtitle: string;
  heroSlides: string[];
  features: { icon: string; title: string; desc: string }[];
  productsTitle: string;
  productsDesc: string;
  productsItems: string[];
  products: Product[];
  aboutTitle: string;
  aboutDesc: string;
  pricingTitle: string;
  pricingSubtitle: string;
  referralBenefitTitle?: string;
  referralBenefitDesc?: string;
  welcomeBonusAmount?: number;
  pricePerSqft?: number;
  pricePerRoom?: number;
  offerTitle?: string;
  offerDescription?: string;
  offerExpiryDate?: string;
  constructionPricingPlans: PricingPlan[];
  interiorPricingPlans: PricingPlan[];
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
