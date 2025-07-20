// src/pages/ButtonSamplesPage.jsx

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    MoreHorizontal, 
    SlidersHorizontal, 
    Settings, 
    Menu, 
    ChevronDown,
    Wrench,
    Cog,
    EllipsisVertical,
    GripVertical,
    ClipboardList,
    Pencil,
    CirclePlus,
    Command,
    Palette,
    AppWindow,
    LayoutPanelLeft,
    SquarePen,
    FileCog,
    MenuSquare,
    BookMarked
} from "lucide-react";

// คอมโพเนนต์ย่อยสำหรับแสดงตัวอย่างแต่ละแบบ
const Sample = ({ title, description, children }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg min-h-[80px] bg-background hover:bg-slate-50 transition-colors">
        <div className="flex-1 pr-4">
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex-shrink-0">
            {children}
        </div>
    </div>
);

// คอมโพเนนต์สำหรับหัวข้อ
const CategoryHeader = ({ title }) => (
    <div className="md:col-span-2 mt-6 mb-2">
        <h3 className="text-lg font-bold text-primary">{title}</h3>
        <hr className="mt-1 border-border" />
    </div>
);

export default function ButtonSamplesPage() {
    return (
        <div className="max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>20 ตัวอย่างดีไซน์ปุ่ม Action</CardTitle>
                    <CardDescription>
                        เลือกสไตล์ที่เหมาะกับโปรเจกต์ของคุณมากที่สุด
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <CategoryHeader title="Standard & Minimal" />

                    <Sample title="Minimal (Ghost)" description="เรียบง่าย สากล ไม่รบกวนสายตา">
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </Sample>

                    <Sample title="Vertical Dots" description="ประหยัดพื้นที่ เหมาะกับ Mobile UI">
                        <Button variant="ghost" size="icon">
                           <EllipsisVertical className="h-4 w-4" />
                        </Button>
                    </Sample>

                    <Sample title="Outline" description="คมชัด มีกรอบ เห็นพื้นที่ชัดเจน">
                        <Button variant="outline" size="icon">
                            <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                    </Sample>

                    <Sample title="Subtle Link" description="ดูเหมือนลิงก์ เรียบง่ายสูงสุด">
                        <Button variant="link" className="p-0 h-auto font-semibold">
                            Actions
                        </Button>
                    </Sample>

                    <CategoryHeader title="Solid & Bold" />

                    <Sample title="Solid (Primary)" description="โดดเด่น เป็นปุ่มหลัก ดึงดูดสายตา">
                         <Button variant="default" size="icon" className="shadow">
                            <Settings className="h-4 w-4" />
                        </Button>
                    </Sample>
                    
                    <Sample title="Secondary" description="ปุ่มรอง นุ่มนวล ไม่เด่นเกินไป">
                        <Button variant="secondary" size="icon">
                            <Cog className="h-4 w-4" />
                        </Button>
                    </Sample>
                    
                    <Sample title="Rounded (Pill)" description="ดูทันสมัยและเป็นมิตรมากขึ้น">
                        <Button variant="secondary" className="rounded-full h-9 w-9 p-0">
                           <Wrench className="h-4 w-4" />
                        </Button>
                    </Sample>

                    <Sample title="Primary Rounded" description="ปุ่มหลักทรงแคปซูล ดูโดดเด่น">
                        <Button variant="default" className="rounded-full h-9 w-9 p-0 shadow-md">
                           <Pencil className="h-4 w-4" />
                        </Button>
                    </Sample>

                    <CategoryHeader title="Text with Icon" />
                    
                    <Sample title="Text + Icon (Outline)" description="ชัดเจน สื่อความหมายครบถ้วน">
                        <Button variant="outline" size="sm">
                            <span>Manage</span>
                            <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                    </Sample>

                    <Sample title="Text + Icon (Ghost)" description="เรียบง่าย แต่ยังคงความชัดเจน">
                        <Button variant="ghost" size="sm">
                           <span>Options</span>
                           <Menu className="h-4 w-4 ml-1.5" />
                        </Button>
                    </Sample>
                    
                    <Sample title="Text + Icon (Link)" description="เป็นกันเอง เข้าถึงง่าย">
                        <Button variant="link" size="sm">
                           <span>More</span>
                           <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                    </Sample>
                    
                    <Sample title="Icon on Left" description="ไอคอนนำหน้าข้อความ ชัดเจน">
                        <Button variant="secondary" size="sm">
                           <FileCog className="h-4 w-4 mr-2" />
                           <span>Actions</span>
                        </Button>
                    </Sample>
                    
                    <CategoryHeader title="Creative & Unique" />

                    <Sample title="Grip Style" description="ให้ความรู้สึกเหมือนลากหรือจัดลำดับได้">
                        <Button variant="ghost" size="icon" className="cursor-grab">
                           <GripVertical className="h-5 w-5" />
                        </Button>
                    </Sample>
                    
                    <Sample title="List Style" description="สื่อถึงรายการของ Actions โดยตรง">
                        <Button variant="outline" size="icon">
                           <ClipboardList className="h-4 w-4" />
                        </Button>
                    </Sample>

                    <Sample title="Add Style" description="สื่อถึงการเพิ่มหรือสร้าง Action ใหม่">
                        <Button variant="outline" size="icon" className="border-dashed">
                           <CirclePlus className="h-4 w-4" />
                        </Button>
                    </Sample>

                    <Sample title="Command Style" description="ดูเท่ เหมือนปุ่ม Command">
                        <Button variant="outline" size="icon">
                           <Command className="h-4 w-4" />
                        </Button>
                    </Sample>
                    
                     <Sample title="Palette Style" description="สื่อถึงการปรับแต่งดีไซน์หรือธีม">
                        <Button variant="ghost" size="icon">
                           <Palette className="h-4 w-4" />
                        </Button>
                    </Sample>

                    <Sample title="Window Style" description="สื่อถึงการเปิดหน้าต่างหรือ Dialog ใหม่">
                        <Button variant="ghost" size="icon">
                           <AppWindow className="h-4 w-4" />
                        </Button>
                    </Sample>

                    <Sample title="Layout Style" description="สื่อถึงการจัดการ Layout หรือ View">
                        <Button variant="outline" size="icon">
                           <LayoutPanelLeft className="h-4 w-4" />
                        </Button>
                    </Sample>
                    
                    <Sample title="Bookmark Style" description="สื่อถึงการบันทึกหรือการกระทำที่สำคัญ">
                        <Button variant="ghost" size="icon">
                           <BookMarked className="h-4 w-4" />
                        </Button>
                    </Sample>

                </CardContent>
            </Card>
        </div>
    );
}