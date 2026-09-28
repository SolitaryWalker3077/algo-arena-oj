package com.oj.friend.entity.exam.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.oj.common.entity.PageQueryDto;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ExamQueryDto extends PageQueryDto {

    private String title;

    private String startTime;

    private String  endTime;

    private Integer type; //0 :未完赛 1：历史竞赛
}
