package com.oj.system.entity.exam.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.oj.common.entity.PageQueryDto;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ExamQueryDto extends PageQueryDto {

    private String title;

//    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
//    @Schema(description = "竞赛开始时间下限，格式：yyyy-MM-dd HH:mm:ss", example = "2026-09-21 09:00:00")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;

//    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
//    @Schema(description = "竞赛结束时间上限，格式：yyyy-MM-dd HH:mm:ss", example = "2026-09-21 18:00:00")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime  endTime;

}
