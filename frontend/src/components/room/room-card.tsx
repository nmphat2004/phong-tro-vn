import { Room } from "@/types";
import { MapPin, Maximize, Maximize2, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import AmenityIcon from "./amenity-icon";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PriceTag } from "./price-tag";

interface Props {
  room: Room;
  layout?: "grid" | "list";
}

const RoomCard = ({ room, layout = "grid" }: Props) => {
  const primaryImage =
    room.images?.find((img) => img.isPrimary) || room.images?.[0];

  if (layout === "list") {
    return (
      <Link href={`/rooms/${room.id}`} className="group">
        <div className="bg-card border border-border/50 rounded-2xl p-3.5 sm:p-4.5 hover:shadow-xl hover:shadow-primary/3 hover:-translate-y-0.5 transition-all duration-300 flex gap-4 sm:gap-5">
          {/* Ảnh */}
          <div className="relative shrink-0 w-28 h-24 sm:w-[220px] sm:h-[150px] overflow-hidden rounded-xl bg-secondary">
            {primaryImage ? (
              <Image
                src={primaryImage.url}
                alt={room.title}
                fill
                sizes="(max-width: 640px) 112px, 220px"
                className="object-cover group-hover:scale-102 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary">
                <Maximize2 className="w-8 h-8 sm:w-12 sm:h-12 opacity-40" />
              </div>
            )}
          </div>

          {/* Thông tin */}
          <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
            <div>
              <h3 className="text-sm sm:text-base font-bold mb-1.5 line-clamp-1 sm:line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200">
                {room.title}
              </h3>

              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-2">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-primary/60" />
                <span className="line-clamp-1">{room.address}</span>
              </div>

              <div className="inline-flex items-baseline gap-1 mb-2">
                <PriceTag size="sm" amount={room.price} />
              </div>

              <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-65" />
                  <span>{room.area}m²</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 border-t border-border/40 sm:border-t-0 pt-2.5 sm:pt-0">
                <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
                  {room.amenities.slice(0, 4).map((amenity) => (
                    <AmenityIcon
                      key={amenity.amenity.id}
                      icon={amenity.amenity.icon}
                      name={amenity.amenity.name}
                      size="sm"
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Desktop Stars */}
                    <div className="hidden sm:flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${star <= room.avgRating ? "fill-amber-400 text-amber-400" : "text-border fill-muted"}`}
                        />
                      ))}
                    </div>
                    {/* Mobile Single Star */}
                    <div className="flex sm:hidden items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold text-foreground">
                        {Number(room.avgRating).toFixed(1)}
                      </span>
                    </div>
                    {room.reviewCount !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        ({room.reviewCount})
                      </span>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full font-medium h-6 sm:h-7 text-[10px] sm:text-xs px-2.5 shrink-0 border",
                      room.status === "AVAILABLE"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400 dark:border-emerald-500/10"
                        : "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-400 dark:border-rose-500/10",
                    )}
                  >
                    {room.status === "AVAILABLE" ? "Còn phòng" : "Đã thuê"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/rooms/${room.id}`} className="group block">
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/3 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
        {/* Ảnh */}
        <div className="relative w-full h-48 sm:h-52 overflow-hidden bg-secondary">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={room.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-104 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary">
              <Maximize2 className="w-12 h-12 opacity-40" />
            </div>
          )}
        </div>

        {/* Thông tin */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="mb-2 line-clamp-2 text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors duration-200">
              {room.title}
            </h3>

            <div className="inline-flex items-baseline gap-1 mb-2">
              <PriceTag size="md" amount={room.price} />
            </div>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4 text-primary/60 shrink-0" />
              <span className="line-clamp-1">{room.address}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${star <= room.avgRating ? "fill-amber-400 text-amber-400" : "text-border fill-muted"}`}
                  />
                ))}
              </div>
              {room.reviewCount !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ({room.reviewCount})
                </span>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full font-medium h-6.5 sm:h-7 text-[10px] sm:text-xs px-2.5 shrink-0 border",
                room.status === "AVAILABLE"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400 dark:border-emerald-500/10"
                  : "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-400 dark:border-rose-500/10",
              )}
            >
              {room.status === "AVAILABLE" ? "Còn phòng" : "Đã cho thuê"}
            </Badge>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default RoomCard;
