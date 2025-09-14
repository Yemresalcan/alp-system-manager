-- Equipment tracking için sorting function'ı ekle
-- Kullanımda olanlar en başa gelsin

CREATE OR REPLACE FUNCTION get_sorted_equipment(
  search_term TEXT DEFAULT NULL,
  equipment_type_filter equipment_type DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  technician_filter UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
) RETURNS SETOF equipment_tracking
LANGUAGE SQL
AS $$
  SELECT *
  FROM equipment_tracking
  WHERE 
    (search_term IS NULL OR 
     serial_number ILIKE '%' || search_term || '%' OR
     assigned_technician_name ILIKE '%' || search_term || '%' OR
     location ILIKE '%' || search_term || '%')
  AND
    (equipment_type_filter IS NULL OR equipment_type = equipment_type_filter)
  AND
    (status_filter IS NULL OR current_status = status_filter)
  AND
    (technician_filter IS NULL OR assigned_technician_id = technician_filter)
  ORDER BY 
    -- Priority sorting: in_use first, then assigned, then available, then others
    CASE current_status
      WHEN 'in_use' THEN 1
      WHEN 'assigned' THEN 2  
      WHEN 'available' THEN 3
      ELSE 4
    END,
    -- Within same status, sort by date (newest first)
    created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- Test the function
SELECT equipment_type, serial_number, current_status, created_at
FROM get_sorted_equipment() 
LIMIT 10;
