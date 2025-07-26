// src/components/layout/MainLayout.jsx

import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
    LogOut, Menu, X, User, ArrowRightLeft, Building2, 
    ShoppingCart, Settings, Package, Boxes, Tag, Users as UsersIcon, 
    HardDrive, Layers, Wrench, BookUser, Truck, Globe, Building // Added Building
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useAuthStore from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NavItem = ({ to, icon, text, isCollapsed, handleclick }) => (
    <NavLink
        to={to}
        onClick={handleclick}
        className={({ isActive }) => cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors relative font-medium",
            "text-slate-600 hover:bg-slate-200 hover:text-slate-900",
            isCollapsed && "justify-center",
            isActive && "bg-blue-100 text-blue-700"
        )}
    >
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    {icon}
                </TooltipTrigger>
                {isCollapsed && (
                    <TooltipContent side="right">
                        <p>{text}</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>

        <span className={cn(
            "whitespace-nowrap transition-opacity duration-200",
            isCollapsed ? "opacity-0 hidden" : "opacity-100"
        )}>
            {text}
        </span>
    </NavLink>
);

const LanguageToggle = () => {
    const { i18n, t } = useTranslation();
    const toggleLanguage = () => {
        const newLang = i18n.language === 'th' ? 'en' : 'th';
        i18n.changeLanguage(newLang);
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={toggleLanguage} className="w-[88px]">
                        <span className="mr-2 text-lg">
                            {i18n.language === 'th' ? '🇹🇭' : '🇬🇧'}
                        </span>
                        <span className="font-semibold">
                            {i18n.language.toUpperCase()}
                        </span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Change Language</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


const MainLayout = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const logout = useAuthStore((state) => state.logout);
    const currentUser = useAuthStore((state) => state.user);
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const onNavLinkClick = () => {
        if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false);
        }
    }

    const SidebarContent = () => (
        <div className="flex flex-col h-full relative">
            <div className="p-4 border-b flex items-center gap-3 h-[65px]">
                <div className="bg-primary p-2 rounded-lg">
                    <Layers className="text-primary-foreground" size={24}/>
                </div>
                <h1 className={cn("text-xl font-bold text-slate-800 transition-all", isSidebarCollapsed && "opacity-0 hidden")}>IMS</h1>
                <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-500 hover:text-slate-800 ml-auto">
                    <X size={24} />
                </button>
            </div>
            
            <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
                 <NavItem to="/dashboard" icon={<Boxes size={18} />} text={t('dashboard')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                
                <div>
                    <p className={cn("px-3 mt-4 mb-2 text-slate-400 text-xs font-semibold uppercase tracking-wider", isSidebarCollapsed && "text-center")}>
                        {isSidebarCollapsed ? t('business').charAt(0) : t('business')}
                    </p>
                    <div className="space-y-1">
                        <NavItem to="/sales" icon={<ShoppingCart size={18}/>} text={t('sales')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/borrowings" icon={<ArrowRightLeft size={18}/>} text={t('borrowing')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/customers" icon={<UsersIcon size={18}/>} text={t('customers')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                    </div>
                </div>

                <div>
                    <p className={cn("px-3 mt-4 mb-2 text-slate-400 text-xs font-semibold uppercase tracking-wider", isSidebarCollapsed && "text-center")}>
                         {isSidebarCollapsed ? t('repair').charAt(0) : t('repair')}
                    </p>
                    <div className="space-y-1">
                        <NavItem to="/repairs" icon={<Wrench size={18}/>} text={t('repairOrders')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/addresses" icon={<BookUser size={18}/>} text={t('addressBook')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                    </div>
                </div>

                <div>
                    <p className={cn("px-3 mt-4 mb-2 text-slate-400 text-xs font-semibold uppercase tracking-wider", isSidebarCollapsed && "text-center")}>
                        {isSidebarCollapsed ? t('products').charAt(0) : t('products')}
                    </p>
                     <div className="space-y-1">
                        <NavItem to="/inventory" icon={<Package size={18}/>} text={t('inventory')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/product-models" icon={<Boxes size={18}/>} text={t('models')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/brands" icon={<Building2 size={18}/>} text={t('brands')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/categories" icon={<Tag size={18}/>} text={t('categories')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/suppliers" icon={<Truck size={18}/>} text={t('suppliers')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                    </div>
                </div>

                <div>
                    <p className={cn("px-3 mt-4 mb-2 text-slate-400 text-xs font-semibold uppercase tracking-wider", isSidebarCollapsed && "text-center")}>
                        {isSidebarCollapsed ? t('assets').charAt(0) : t('assets')}
                    </p>
                    <div className="space-y-1">
                        <NavItem to="/asset-assignments" icon={<HardDrive size={18}/>} text={t('assignments')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/assets" icon={<Layers size={18}/>} text={t('assetList')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                    </div>
                </div>

                {isSuperAdmin && (
                     <div className="pt-2">
                        <p className={cn("px-3 mt-4 mb-2 text-slate-400 text-xs font-semibold uppercase tracking-wider", isSidebarCollapsed && "text-center")}>
                            {isSidebarCollapsed ? t('system').charAt(0) : t('system')}
                        </p>
                        <div className="space-y-1">
                            <NavItem to="/company-profile" icon={<Building size={18}/>} text="Company Profile" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                            <NavItem to="/users" icon={<Settings size={18}/>} text={t('userManagement')} isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        </div>
                    </div>
                )}
            </nav>
        </div>
    );

    return (
        <div className="relative min-h-screen md:flex bg-slate-50">
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-20 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            <aside
                className={cn(
                    "bg-white border-r",
                    "fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out",
                    "md:relative md:translate-x-0",
                    "transition-all duration-300 ease-in-out", 
                    isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full",
                    isSidebarCollapsed ? "md:w-20" : "md:w-64"
                )}
            >
                <SidebarContent />
            </aside>
            
            <div className="flex-1 flex flex-col max-h-screen font-sarabun">
                <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b flex justify-between items-center px-4 h-[65px]">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu className="h-6 w-6" />
                        </Button>
                        <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                            <Menu className="h-6 w-6" />
                        </Button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <LanguageToggle />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 h-10 px-3">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                    <span className="hidden sm:inline-block font-medium">{currentUser?.name}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{currentUser?.name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{currentUser?.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate('/profile')}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>{t('profile_details')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Logout</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                    >
                        <Outlet />
                    </motion.div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;