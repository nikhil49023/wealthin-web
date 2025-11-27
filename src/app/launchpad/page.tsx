
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FileText,
  Building,
  Banknote,
  Rocket,
  Megaphone,
  Lightbulb,
  Sparkles,
  Globe,
  LogIn,
  X,
  Briefcase,
  MessagesSquare,
  Loader2,
  Bell,
  Info,
  Search,
  Phone,
  User,
  Link as LinkIcon,
  Mail,
  MessageSquare,
  Filter,
  MapPin,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { useLanguage } from '@/hooks/use-language';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import Autoplay from 'embla-carousel-autoplay';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { GenerateFinBiteOutput } from '@/ai/schemas/fin-bite';
import { useAuth, type UserProfile } from '@/context/auth-provider';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { generateFinBiteAction } from '@/app/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const db = getFirestore(app);

const msmeServiceCategories = [
  'IT / Software Services',
  'Retail / E-commerce',
  'Construction / Real Estate',
  'Manufacturing',
  'Food & Agro Processing',
  'Hospitality & Tourism',
  'Healthcare & Pharma',
  'Logistics & Supply Chain',
  'Professional Services (Accounting, Legal, etc.)',
  'Textiles & Apparel',
  'Other',
];

const PortalCard = ({
  title,
  description,
  url,
  loginText,
}: {
  title: string;
  description: string;
  url: string;
  loginText: string;
}) => (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block h-full">
        <Card className="h-full flex flex-col hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-center gap-4">
            <svg
                className="w-12 h-12 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinejoin="round"
                ></path>
                <path
                d="M3.5 7.5L12 12.5L20.5 7.5"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinejoin="round"
                ></path>
                <path
                d="M12 21.5V12.5"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinejoin="round"
                ></path>
            </svg>
            <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
            <p className="text-muted-foreground text-sm">{description}</p>
            </CardContent>
            <CardContent>
            <Button className="w-full">
                <LogIn className="mr-2 h-4 w-4" /> {loginText}
            </Button>
            </CardContent>
        </Card>
    </a>
);


export default function GrowthHubPage() {
  const { translations } = useLanguage();
  const [finBite, setFinBite] = useState<GenerateFinBiteOutput | null>(null);
  const [isLoadingFinBite, setIsLoadingFinBite] = useState(false);
  const [finBiteError, setFinBiteError] = useState<string | null>(null);
  const { user, userProfile } = useAuth();
  const isMsme = userProfile?.role === 'msme';
  const { toast } = useToast();

  const [msmeList, setMsmeList] = useState<(UserProfile & { id: string })[]>([]);
  const [isLoadingMsmes, setIsLoadingMsmes] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMsme, setSelectedMsme] = useState<any | null>(null);

  const [filterService, setFilterService] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  
  const fetchFinBite = useCallback(async () => {
    setIsLoadingFinBite(true);
    setFinBiteError(null);

    const cachedFinBite = sessionStorage.getItem('finBiteCache');
    if (cachedFinBite) {
      try {
        setFinBite(JSON.parse(cachedFinBite));
        setIsLoadingFinBite(false);
        return;
      } catch (e) {
        console.error("Failed to parse cached FinBite", e);
        sessionStorage.removeItem('finBiteCache');
      }
    }
    
    try {
        const result = await generateFinBiteAction();
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch updates.');
        }
        const data = result.data;
        setFinBite(data);
        sessionStorage.setItem('finBiteCache', JSON.stringify(data));
    } catch (e: any) {
        setFinBiteError(e.message);
    } finally {
        setIsLoadingFinBite(false);
    }
  }, []);
  
  useEffect(() => {
    setIsLoadingMsmes(true);
    const profilesRef = collection(db, 'msme-profiles');
    const unsubscribe = onSnapshot(profilesRef, (snapshot) => {
      const msmes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (UserProfile & { id: string })[];
      setMsmeList(msmes);
      setIsLoadingMsmes(false);
    },
    async (error) => {
        console.error("Error fetching MSME profiles: ", error);
        const permissionError = new FirestorePermissionError({
            path: profilesRef.path,
            operation: 'list'
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({variant: 'destructive', title: 'Error', description: 'Could not load marketplace profiles.'});
        setIsLoadingMsmes(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const handleContactClick = (msme: any) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to view contact details.' });
        return;
    }
    setSelectedMsme(msme);
  };
  
  const uniqueLocations = useMemo(() => {
    const locations = new Set(msmeList.map(msme => msme.msmeLocation).filter(Boolean));
    return Array.from(locations).sort();
  }, [msmeList]);

  const uniqueServices = useMemo(() => {
    const services = new Set(msmeList.map(msme => msme.msmeService).filter(Boolean));
    return Array.from(services).sort();
  }, [msmeList]);


  const filteredMsmes = msmeList.filter(msme => {
      const searchMatch = (
        msme.msmeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msme.msmeService?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msme.msmeLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (msme as any).msmeDescription?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const serviceMatch = filterService ? msme.msmeService === filterService : true;
      const locationMatch = filterLocation ? msme.msmeLocation === filterLocation : true;

      return searchMatch && serviceMatch && locationMatch;
    }
  );

  const startupSteps = [
    {
      icon: Lightbulb,
      title: translations.launchpad.startupJourney.step1.title,
      description: (
        <>
          {translations.launchpad.startupJourney.step1.description} Use the{' '}
          <Link href="/brainstorm" className="text-primary underline">
            Brainstorm
          </Link>{' '}
          feature to get started.
        </>
      ),
    },
    {
      icon: FileText,
      title: translations.launchpad.startupJourney.step2.title,
      description: translations.launchpad.startupJourney.step2.description,
    },
    {
      icon: Building,
      title: translations.launchpad.startupJourney.step3.title,
      description: (
        <>
          Choose a business structure (Sole Proprietorship, LLP, Pvt. Ltd.) and
          complete the legal registration process. Check for state-specific
          portals like{' '}
          <a href="https://apmsmeone.ap.gov.in/MSMEONE/LoginPages/HomeLogin.aspx" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            APMSME ONE
          </a>.
        </>
      ),
    },
    {
      icon: Banknote,
      title: translations.launchpad.startupJourney.step4.title,
      description: translations.launchpad.startupJourney.step4.description,
    },
    {
      icon: Rocket,
      title: translations.launchpad.startupJourney.step5.title,
      description: translations.launchpad.startupJourney.step5.description,
    },
    {
      icon: Megaphone,
      title: translations.launchpad.startupJourney.step6.title,
      description: translations.launchpad.startupJourney.step6.description,
    },
  ];

  const msmeClusters = [
    {
      name: 'Readymade Garments Cluster',
      location: 'Rayadurg (Anantapur)',
      sector: 'Textile/Apparel',
      description:
        'Specializing in ready-to-wear clothes, supporting jobs and exports.',
    },
    {
      name: 'Powerloom Cluster',
      location: 'Nagari (Chittoor)',
      sector: 'Textile',
      description:
        'Center for powerloom-based weaving units, producing fabric for various markets.',
    },
    {
      name: 'Brass Utensils Cluster',
      location: 'Srikalahasti (Chittoor)',
      sector: 'Metal Utensils',
      description:
        'Artisanal brass utensil production hub for kitchenware and religious items.',
    },
    {
      name: 'Rice Mills Cluster',
      location: 'East Godavari',
      sector: 'Agro/Food Processing',
      description:
        'Major contributor to state’s rice export and domestic supply.',
    },
    {
      name: 'Graphite Crucibles Cluster',
      location: 'Rajahmundry (East Godavari)',
      sector: 'Refractory/Metals',
      description: 'Crucibles for metallurgical and foundry industries.',
    },
    {
      name: 'Coir & Coir Products Cluster',
      location: 'Anakapalli, East Godavari',
      sector: 'Agro/Handicraft',
      description:
        'Makers of mats, ropes, and eco-products, supporting coconut farmers.',
    },
    {
      name: 'Aluminium Utensils Cluster',
      location: 'Rajahmundry (East Godavari)',
      sector: 'Metal Utensils',
      description: 'Focused on aluminium cookware and utility products.',
    },
    {
      name: 'Refractory Products Cluster',
      location: 'East & West Godavari',
      sector: 'Industrial Materials',
      description: 'Advanced materials for factories and heavy industry.',
    },
    {
      name: 'Lime Calcination Cluster',
      location: 'Guntur',
      sector: 'Minerals',
      description: 'Lime producers for construction, chemicals, and agriculture.',
    },
    {
      name: 'Powerloom Cluster',
      location: 'Guntur',
      sector: 'Textile',
      description: 'Textile cluster weaving fabrics for various sectors.',
    },
    {
      name: 'Plastic Products Cluster',
      location: 'Adilabad, Nalgonda',
      sector: 'Plastics',
      description: 'Supplying industrial and consumer plastic goods.',
    },
    {
      name: 'Burnt Lime Industry Cluster',
      location: 'Piduguralla (Guntur)',
      sector: 'Industrial Minerals',
      description: 'Specializes in burnt lime production for industrial uses.',
    },
    {
      name: 'Crochet Lace Industry Cluster',
      location: 'Narsapur (West Godavari)',
      sector: 'Handicraft/Textile',
      description:
        'Famous for handmade crochet lace, supporting rural artisans.',
    },
    {
      name: 'Imitation Jewellery Cluster',
      location: 'Machilipatnam (Krishna)',
      sector: 'Gems & Jewellery',
      description: 'Design and manufacturing of imitation jewellery.',
    },
    {
      name: 'Food Processing Cluster',
      location: 'Vijayawada (Krishna)',
      sector: 'Food Processing',
      description:
        'Units handling value-added food products, packaging, and export.',
    },
  ];

  const govtSchemes = [
    {
      icon: Briefcase,
      title: 'AP MSME & Entrepreneur Development Policy 4.0 (2024–29)',
      description:
        'Capital subsidy, tax reimbursement, land rebates for MSMEs, priority for women/SC/ST/backward region entrepreneurs, “One Family, One Entrepreneur” vision, plug-and-play industrial parks.',
      url: 'https://www.apindustries.gov.in/apindus/Data/policies/AP%20MSME%20&%20EDP%20(4.0)%20-%202024-29.pdf',
    },
    {
      icon: Briefcase,
      title: 'MSE-CDP (Cluster Development Programme)',
      description:
        'Support for MSME clusters with grants for common facilities, technology upgrade, shared infrastructure.',
      url: 'https://cluster.dcmsme.gov.in',
    },
    {
      icon: Briefcase,
      title: 'CGTMSE (Credit Guarantee Fund Trust for Micro and Small Enterprises)',
      description:
        'Collateral-free business loans for micro and small enterprises, increased formal credit flow, guarantees up to ₹5 crore.',
      url: 'https://www.cgtmse.in/',
    },
    {
      icon: Briefcase,
      title: 'RAMP (Raising and Accelerating MSME Performance)',
      description:
        'Capacity building, export and market access, MSME formalization, digital tools, state grants for Strategic Investment Plan (SIP) implementation.',
      url: 'https://apmsmeone.ap.gov.in/MSMEONE/RAMP/AboutRamp.aspx?ID=ABOUT',
    },
    {
      icon: Briefcase,
      title: 'ZED Certification Scheme (Zero Defect Zero Effect)',
      description:
        'Enhances quality and sustainability for MSME manufacturing enterprises, subsidy for Bronze/Silver/Gold certification levels.',
      url: 'https://zed.msme.gov.in/certification-process',
    },
    {
      icon: Briefcase,
      title: 'PMEGP (Prime Minister’s Employment Generation Programme)',
      description:
        'Subsidy-linked loans for new micro enterprises, self-employment generation.',
      url: 'https://www.kviconline.gov.in/pmegpeportal/pmegphome/index.jsp',
    },
  ];

  const clustersPlugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: false, stopOnMouseEnter: true })
  );
  const schemesPlugin = React.useRef(
    Autoplay({ delay: 2500, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  return (
    <div className="space-y-8 md:space-y-12">
      <div className="flex justify-between items-center">
        <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Rocket className="h-8 w-8" />
                {isMsme ? translations.growthHub.title : translations.launchpad.title}
            </h1>
            <p className="text-muted-foreground mt-1">
                {isMsme ? translations.growthHub.description : translations.launchpad.description}
            </p>
        </div>
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-12 w-12 flex-shrink-0" onClick={fetchFinBite}>
                    <Bell className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Latest Updates</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-4">
                    {isLoadingFinBite ? (
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : finBiteError ? (
                        <Alert variant="destructive">
                            <AlertDescription>{finBiteError}</AlertDescription>
                        </Alert>
                    ) : finBite?.updates ? (
                       finBite.updates.map((update, index) => (
                         <Card key={index} className="bg-background">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                     <Info className="h-5 w-5 text-primary flex-shrink-0" />
                                     {update.category}
                                 </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <p className="font-semibold">{update.title}</p>
                                <p className="text-sm text-muted-foreground">{update.summary}</p>
                            </CardContent>
                        </Card>
                       ))
                    ) : null}
                    <Button variant="secondary" onClick={fetchFinBite} disabled={isLoadingFinBite}>
                        {isLoadingFinBite ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Refresh Updates
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                    <Briefcase />
                    MSME Marketplace
                </CardTitle>
                <CardDescription>
                    Find and connect with services offered by other entrepreneurs in the WealthIn community.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search by name, service, or location..." 
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Select value={filterService} onValueChange={setFilterService}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by service..." />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueServices.map(service => (
                                    <SelectItem key={service} value={service}>{service}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Select value={filterLocation} onValueChange={setFilterLocation}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by location..." />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueLocations.map(location => (
                                    <SelectItem key={location} value={location}>{location}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setSearchQuery(''); setFilterService(''); setFilterLocation(''); }}
                    className="text-xs"
                >
                    <X className="mr-2 h-3 w-3" /> Clear Filters
                </Button>


                {isLoadingMsmes ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                    </div>
                ) : filteredMsmes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMsmes.map((msme) => (
                           <Card key={msme.id} className="glassmorphic flex flex-col hover:border-primary transition-colors duration-300">
                                <CardHeader>
                                    <CardTitle className="text-lg">{msme.msmeName}</CardTitle>
                                    <CardDescription>{msme.msmeService}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-4">
                                     <p className="text-sm text-muted-foreground line-clamp-3">{(msme as any).msmeDescription || 'No description provided.'}</p>
                                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                                        <User className="h-4 w-4" />
                                        <span>{msme.displayName}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                                        <MapPin className="h-4 w-4" />
                                        <span>{msme.msmeLocation}</span>
                                    </div>
                                </CardContent>
                                <CardContent className="pt-0 flex items-center justify-end gap-2">
                                    <Button onClick={() => handleContactClick(msme)} size="sm">
                                        <MessageSquare className="mr-2"/>
                                        Contact
                                    </Button>
                                    {msme.msmeWebsite && (
                                        <Button asChild variant="outline" size="icon">
                                            <a href={msme.msmeWebsite.startsWith('http') ? msme.msmeWebsite : `https://${msme.msmeWebsite}`} target="_blank" rel="noopener noreferrer">
                                                <Globe/>
                                            </a>
                                        </Button>
                                    )}
                                </CardContent>
                           </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">No matching MSMEs found. Try adjusting your filters.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        
        {isMsme && (
            <Card className="lg:col-span-2">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                        <Globe />
                        Build Your Online Presence
                    </CardTitle>
                    <CardDescription>
                       Create a professional website for your business with Zoho Sites.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">A website is crucial for credibility and reaching new customers. Zoho Sites offers a simple, drag-and-drop builder perfect for getting your business online quickly.</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2">
                        <li>Choose from dozens of professional, mobile-friendly templates.</li>
                        <li>Easily add photo galleries, contact forms, and social media links.</li>
                        <li>No coding required to build a beautiful, functional site.</li>
                    </ul>
                     <Button asChild>
                        <a href="https://www.zoho.com/sites/" target="_blank" rel="noopener noreferrer">
                           <Rocket className="mr-2" /> Get Started with Zoho Sites
                        </a>
                    </Button>
                </CardContent>
            </Card>
        )}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
              <Globe />
              {translations.launchpad.statePortals.title}
            </CardTitle>
            <CardDescription>
              {translations.launchpad.statePortals.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PortalCard
                title={translations.launchpad.statePortals.apmsmeone.title}
                description={translations.launchpad.statePortals.apmsmeone.description}
                url="https://apmsmeone.ap.gov.in/MSMEONE/LoginPages/HomeLogin.aspx"
                loginText={translations.launchpad.statePortals.loginToPortal}
            />
          </CardContent>
        </Card>

        {!isMsme && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">
              {translations.launchpad.startupJourney.title}
            </CardTitle>
            <CardDescription>
              {translations.launchpad.startupJourney.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {startupSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="p-3 bg-primary/10 text-primary rounded-full">
                  <step.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
        )}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
              <Sparkles />
              MSME Clusters in AP
            </CardTitle>
            <CardDescription>
              Explore major and existing MSME clusters in Andhra Pradesh for
              your venture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Carousel
              opts={{
                align: 'start',
                loop: true,
              }}
              plugins={[clustersPlugin.current]}
              className="w-full"
              onMouseEnter={clustersPlugin.current.stop}
              onMouseLeave={clustersPlugin.current.reset}
            >
              <CarouselContent>
                {msmeClusters.map((cluster, index) => (
                  <CarouselItem
                    key={index}
                    className="md:basis-1/2 lg:basis-1/3"
                  >
                    <div className="p-1 h-full">
                      <Card className="h-full flex flex-col hover:bg-accent/50">
                        <CardHeader>
                          <CardTitle className="text-base">
                            {cluster.name}
                          </CardTitle>
                          <CardDescription>{cluster.location}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-2">
                          <Badge variant="secondary">{cluster.sector}</Badge>
                          <p className="text-muted-foreground text-sm">
                            {cluster.description}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
              <Banknote />
              Key Government Schemes
            </CardTitle>
            <CardDescription>
              Leverage these government initiatives to fuel your growth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Carousel
              opts={{
                align: 'start',
                loop: true,
              }}
              plugins={[schemesPlugin.current]}
              className="w-full"
              onMouseEnter={schemesPlugin.current.stop}
              onMouseLeave={schemesPlugin.current.reset}
            >
              <CarouselContent>
                {govtSchemes.map((scheme, index) => (
                  <CarouselItem
                    key={index}
                    className="md:basis-1/2 lg:basis-1/3"
                  >
                    <div className="p-1 h-full">
                      <Card className="h-full flex flex-col hover:bg-accent/50">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <scheme.icon className="h-6 w-6 text-primary" />
                            {scheme.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-2">
                          <p className="text-muted-foreground text-sm">
                            {scheme.description}
                          </p>
                        </CardContent>
                        <CardContent>
                          <Button asChild variant="link" className="p-0">
                            <a
                              href={scheme.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Learn More
                            </a>
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </CardContent>
        </Card>
      </div>

        <Dialog open={!!selectedMsme} onOpenChange={(isOpen) => !isOpen && setSelectedMsme(null)}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Contact {selectedMsme?.msmeName}</DialogTitle>
                    <DialogDescription>
                        You can reach out to {selectedMsme?.displayName || 'the owner'} using the details below.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <span className="font-mono">{selectedMsme?.ownerContact || 'Not Provided'}</span>
                    </div>
                     <div className="flex items-center gap-4">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <span className="font-mono">{selectedMsme?.email || 'Not Provided'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4">
                        <Button asChild variant="outline" disabled={!selectedMsme?.ownerContact} className="w-full">
                            <a href={`tel:${selectedMsme?.ownerContact}`}>
                                <Phone /> Call
                            </a>
                        </Button>
                        <Button asChild variant="outline" disabled={!selectedMsme?.ownerContact} className="w-full">
                            <a href={`sms:${selectedMsme?.ownerContact}`}>
                                <MessageSquare /> Message
                            </a>
                        </Button>
                        <Button asChild variant="outline" disabled={!selectedMsme?.email} className="w-full">
                            <a href={`mailto:${selectedMsme?.email}`}>
                                <Mail /> Email
                            </a>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
