package com.oj.system.entity.exam.dto;

import com.oj.common.entity.PageQueryDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Data
public class ExamQueryDto extends PageQueryDto {

    private String title;

//    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
//    @Schema(description = "竞赛开始时间下限，格式：yyyy-MM-dd HH:mm:ss", example = "2026-09-21 09:00:00")
    private String startTime;

//    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
//    @Schema(description = "竞赛结束时间上限，格式：yyyy-MM-dd HH:mm:ss", example = "2026-09-21 18:00:00")
    private String  endTime;

}
