// src/components/layout/MainLayout.jsx

import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
    LogOut, Menu, X, UserCircle, User, ArrowRightLeft, Building2, 
    ShoppingCart, Settings, Package, Boxes, Tag, Users as UsersIcon, 
    HardDrive, Layers, Wrench, BookUser, ChevronsLeft, ChevronsRight 
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

const NavItem = ({ to, icon, text, isCollapsed, handleclick }) => (
    <NavLink
        to={to}
        onClick={handleclick}
        className={({ isActive }) => cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors",
            isCollapsed && "justify-center",
            isActive ? 'bg-slate-700 font-semibold' : 'hover:bg-slate-800'
        )}
    >
        {icon}
        <span className={cn(
            "whitespace-nowrap transition-opacity duration-200",
            isCollapsed ? "opacity-0 hidden" : "opacity-100"
        )}>
            {text}
        </span>
    </NavLink>
);


const MainLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
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
        <div className="flex flex-col h-full text-slate-200 relative">
            {/* --- START: แก้ไขส่วนปุ่ม Toggle --- */}
            <Button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                variant="ghost"
                size="icon"
                className="absolute top-1/2 -right-3 z-10 h-6 w-6 rounded-full bg-slate-700 text-white hover:bg-slate-600 hover:text-white hidden md:flex"
            >
                {isSidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            </Button>
            {/* --- END --- */}

            <div className="p-4 border-b border-slate-700 flex justify-between items-center h-[65px]">
                <h1 className={cn("text-2xl font-bold transition-all", isSidebarCollapsed && "opacity-0 hidden")}>IMS</h1>
                <h1 className={cn("text-2xl font-bold transition-all", !isSidebarCollapsed && "opacity-0 hidden")}>I</h1>
                <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>
            
            <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
                <NavItem to="/dashboard" icon={<Boxes size={18} />} text="Dashboard" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                
                <div>
                    <p className={cn("px-3 py-2 text-slate-400 text-xs font-bold uppercase", isSidebarCollapsed && "text-center")}>
                        {isSidebarCollapsed ? "B" : "Business"}
                    </p>
                    <div className="space-y-1">
                        <NavItem to="/sales" icon={<ShoppingCart size={18}/>} text="Sales" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/borrowings" icon={<ArrowRightLeft size={18}/>} text="Borrowing" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/customers" icon={<UsersIcon size={18}/>} text="Customers" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                    </div>
                </div>

                <div>
                    <p className={cn("px-3 py-2 text-slate-400 text-xs font-bold uppercase", isSidebarCollapsed && "text-center")}>
                         {isSidebarCollapsed ? "R" : "Repair"}
                    </p>
                    <div className="space-y-1">
                        <NavItem to="/repairs" icon={<Wrench size={18}/>} text="Repair Orders" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/addresses" icon={<BookUser size={18}/>} text="Address Book" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                    </div>
                </div>

                <div>
                    <p className={cn("px-3 py-2 text-slate-400 text-xs font-bold uppercase", isSidebarCollapsed && "text-center")}>
                        {isSidebarCollapsed ? "P" : "Products"}
                    </p>
                     <div className="space-y-1">
                        <NavItem to="/inventory" icon={<Package size={18}/>} text="Inventory" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/product-models" icon={<Boxes size={18}/>} text="Models" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/brands" icon={<Building2 size={18}/>} text="Brands" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/categories" icon={<Tag size={18}/>} text="Categories" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                    </div>
                </div>

                <div>
                    <p className={cn("px-3 py-2 text-slate-400 text-xs font-bold uppercase", isSidebarCollapsed && "text-center")}>
                        {isSidebarCollapsed ? "A" : "Assets"}
                    </p>
                    <div className="space-y-1">
                        <NavItem to="/asset-assignments" icon={<HardDrive size={18}/>} text="Assignments" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        <NavItem to="/assets" icon={<Layers size={18}/>} text="Asset List" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                    </div>
                </div>

                {isSuperAdmin && (
                     <div className="!mt-auto pt-2 border-t border-slate-700">
                        <p className={cn("px-3 py-2 text-slate-400 text-xs font-bold uppercase", isSidebarCollapsed && "text-center")}>
                            {isSidebarCollapsed ? "S" : "System"}
                        </p>
                        <div className="space-y-1">
                            <NavItem to="/users" icon={<Settings size={18}/>} text="User Management" isCollapsed={isSidebarCollapsed} handleclick={onNavLinkClick} />
                        </div>
                    </div>
                )}
            </nav>
        </div>
    );

    return (
        <div className="relative min-h-screen md:flex">
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black opacity-50 z-20 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            <aside
                className={cn(
                    "bg-slate-900 transform transition-all duration-300 ease-in-out",
                    "fixed inset-y-0 left-0 z-30",
                    isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
                    "md:relative md:translate-x-0",
                    isSidebarCollapsed ? "md:w-20" : "md:w-64"
                )}
            >
                <SidebarContent />
            </aside>
            
            <div className="flex-1 flex flex-col max-h-screen font-sarabun">
                <header className="bg-white shadow-sm flex justify-between items-center p-2 md:p-4 h-[65px]">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </Button>

                    <div className="hidden md:block flex-1"></div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100">
                                <UserCircle className="h-8 w-8 text-slate-500" />
                                <div className="hidden sm:block text-left">
                                    <p className="font-semibold text-sm">{currentUser?.name || 'User'}</p>
                                    <p className="text-xs text-slate-500">{currentUser?.role}</p>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate('/profile')}>
                                <User className="mr-2 h-4 w-4" />
                                <span>Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Logout</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-gray-100">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <Outlet />
                    </motion.div>
                </main>
                
                <footer className="p-4 bg-white text-center text-sm text-muted-foreground border-t no-print">
                    © 2025 NTPLC Engineer Of Nakhon Si Thammarat. All Rights Reserved. - Version 1.0.0
                </footer>
            </div>
        </div>
    );
};

export default MainLayout;