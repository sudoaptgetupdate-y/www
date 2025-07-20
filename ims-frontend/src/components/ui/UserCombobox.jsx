// src/components/ui/UserCombobox.jsx

import { useState, useEffect } from "react";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function UserCombobox({ selectedValue, onSelect, initialUser }) {
  const token = useAuthStore((state) => state.token);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserDisplay, setSelectedUserDisplay] = useState(null);

  useEffect(() => {
    if (initialUser) {
      setSelectedUserDisplay(initialUser);
      setUsers([initialUser]);
    }
  }, [initialUser]);
  
  useEffect(() => {
    if (open) {
      const fetchUsers = async () => {
        try {
          const response = await axiosInstance.get("/users", {
            headers: { Authorization: `Bearer ${token}` },
            params: { all: 'true' },
          });
          setUsers(response.data);
        } catch (error) {
          toast.error("Failed to fetch users.");
        }
      };
      fetchUsers();
    }
  }, [open, token]);
  
  useEffect(() => {
    if (selectedValue) {
        const user = users.find(u => String(u.id) === selectedValue);
        if (user) {
            setSelectedUserDisplay(user);
        }
    } else {
        setSelectedUserDisplay(null);
    }
  }, [selectedValue, users]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <span className="truncate">
            {selectedValue && selectedUserDisplay
              ? `${selectedUserDisplay.name} (${selectedUserDisplay.username})`
              : "Select user..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search user by name..." />
          <CommandList>
            <CommandEmpty>No user found.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.name}
                  onSelect={() => {
                     onSelect(String(user.id));
                     setSelectedUserDisplay(user);
                     setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === String(user.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {user.name} ({user.username})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}