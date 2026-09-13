package com.oj.system.entity.question.dto;


import com.oj.common.entity.PageQueryDto;
import lombok.Data;

@Data
public class QuestionQueryDto extends PageQueryDto {

    private Integer difficult;

    private String title;


}
